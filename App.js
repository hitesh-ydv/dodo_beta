import React, { useState, useEffect, useRef, use } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  TouchableHighlight,
  Alert,
  SafeAreaView,
  Image,
  Linking,
  ActivityIndicator,
  Platform,
  Modal,
  Button
} from 'react-native';
import WebView from 'react-native-webview';
import { useCallback } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import FadeInView from 'react-native-fade-in-view';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ripple from 'react-native-material-ripple';

const HomeScreen = ({ navigation }) => {
  const [isHeaderEnabled, setHeaderEnabled] = useState(true);
  const [isAutoRotationEnabled, setAutoRotationEnabled] = useState(true);
  const [isHttpsRequired, setHttpsRequired] = useState(true);
  const [theme, setTheme] = useState('light');
  const [isLoadingWebView, setLoadingWebView] = useState(false);
  const [isLoadingSafari, setLoadingSafari] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [urlParams, setUrlParams] = useState('');
  const [popup, setPopup] = useState({ visible: false, title: '', message: '', onCancel: null, onConfirm: null });

  const CustomPopup = ({ visible, title, message, onCancel, onConfirm }) => (
    <Modal transparent visible={visible} animationType="fade">
    <View style={styles.modalBackground}>
      <View style={styles.popupContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.proceedButton} onPress={onConfirm}>
            <Text style={styles.proceedText}>Proceed</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
  );

  const saveSettings = async (baseUrl, urlParams) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify({ baseUrl, urlParams }));
      console.log('Settings saved:', { baseUrl, urlParams });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const saveSwitchSettings = async (newSettings) => {
    try {
      const existingSettings = await AsyncStorage.getItem('switchSettings');
      const parsedSettings = existingSettings ? JSON.parse(existingSettings) : {};
      const updatedSettings = { ...parsedSettings, ...newSettings };
      await AsyncStorage.setItem('switchSettings', JSON.stringify(updatedSettings));
      console.log('Switch settings saved:', updatedSettings);
    } catch (error) {
      console.error('Error saving switch settings:', error);
    }
  };

  const handleToggleHeader = (value) => {
    setHeaderEnabled(value);
    saveSwitchSettings({ isHeaderEnabled: value });
  };

  const handleToggleAutoRotation = (value) => {
    setAutoRotationEnabled(value);
    saveSwitchSettings({ isAutoRotationEnabled: value });
  };

  const handleToggleHttps = (value) => {
    setHttpsRequired(value);
    saveSwitchSettings({ isHttpsRequired: value });
  };


  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) {
          setTheme(savedTheme);
          StatusBar.setBarStyle(savedTheme === 'dark' ? 'light-content' : 'dark-content');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      }
    };
    loadTheme();
    StatusBar.setHidden(false, 'fade');
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Ensure the correct status bar color is applied when coming back
      StatusBar.setBarStyle(theme === 'dark' ? 'light-content' : 'dark-content');
    }, [theme])
  );

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      const switchSettings = await AsyncStorage.getItem('switchSettings');

      let baseUrl = '', urlParams = '';
      let isHeaderEnabled = true, isAutoRotationEnabled = true, isHttpsRequired = true; 

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        baseUrl = parsedSettings.baseUrl || '';
        urlParams = parsedSettings.urlParams || '';
      }

      if (switchSettings) {
        const parsedSwitches = JSON.parse(switchSettings);
        isHeaderEnabled = parsedSwitches.isHeaderEnabled ?? true;
        isAutoRotationEnabled = parsedSwitches.isAutoRotationEnabled ?? true;
        isHttpsRequired = parsedSwitches.isHttpsRequired ?? true;
      }

      setBaseUrl(baseUrl);
      setUrlParams(urlParams);
      setHeaderEnabled(isHeaderEnabled);
      setAutoRotationEnabled(isAutoRotationEnabled);
      setHttpsRequired(isHttpsRequired);

      if (baseUrl || urlParams) {
        Alert.alert(
          'Open Previous Website?',
          'Do you want to open the previously saved website?',
          [
            {
              text: 'Cancel', style: 'cancel', onPress: () => StatusBar.setHidden(false),
            },
            { text: 'OK', onPress: () => handleOpenWebView(baseUrl, urlParams, isHeaderEnabled, isAutoRotationEnabled, isHttpsRequired) },
          ]
        );
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);



  useEffect(() => {
    saveSettings(baseUrl, urlParams);
  }, [baseUrl, urlParams]);


  const handleOpenWebView = async (baseUrl, urlParams) => {
    setLoadingWebView(true);

    // Load the latest stored switch settings before proceeding
    try {
        const switchSettings = await AsyncStorage.getItem('switchSettings');
        let isHeaderEnabled = true, isAutoRotationEnabled = true, isHttpsRequired = true;

        if (switchSettings) {
            const parsedSwitches = JSON.parse(switchSettings);
            isHeaderEnabled = parsedSwitches.isHeaderEnabled ?? true;
            isAutoRotationEnabled = parsedSwitches.isAutoRotationEnabled ?? true;
            isHttpsRequired = parsedSwitches.isHttpsRequired ?? true;
        }

        console.log("Opening WebView with settings:");
        console.log("Header Enabled:", isHeaderEnabled);
        console.log("Auto Rotation Enabled:", isAutoRotationEnabled);
        console.log("HTTPS Required:", isHttpsRequired);

        const fullUrl = `${baseUrl}${urlParams}`;
        console.log("Full URL -", fullUrl);

        if (!baseUrl) {
            setPopup({ visible: true, title: 'Error', message: 'Invalid URL. Please enter a valid base URL.' });
            setLoadingWebView(false);
            return;
        }

        // If Auto Rotation is enabled, show popup first
        if (isAutoRotationEnabled) {
            setPopup({
                visible: true,
                title: 'Orientation Lock Check',
                message: 'For Auto Rotation to work, please disable your device\'s orientation lock (via Control Center).',
                onCancel: () => {
                    setLoadingWebView(false);
                    setPopup(prev => ({ ...prev, visible: false }));
                },
                onConfirm: async () => {
                    setPopup(prev => ({ ...prev, visible: false }));
                    await validateAndNavigate(baseUrl, urlParams, isHeaderEnabled, isAutoRotationEnabled, isHttpsRequired);
                },
            });
            return;
        }

        // Directly validate and navigate if Auto Rotation is off
        await validateAndNavigate(baseUrl, urlParams, isHeaderEnabled, isAutoRotationEnabled, isHttpsRequired);

    } catch (error) {
        console.error("Error loading switch settings:", error);
        setPopup({ visible: true, title: 'Error', message: 'Failed to load switch settings.' });
        setLoadingWebView(false);
    }
};

const validateAndNavigate = async (baseUrl, urlParams, isHeaderEnabled, isAutoRotationEnabled, isHttpsRequired) => {
    try {
        setLoadingWebView(true);

        const formData = new FormData();
        formData.append('url', baseUrl);
        formData.append('https', isHttpsRequired ? 'true' : 'false');
        formData.append('perameter', urlParams);

        console.log("Sending request with data:", formData);

        const response = await axios.post('https://mobiledetects.com/valid-url', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        console.log("API Response:", response.data);

        const httpCheck = response.data.https;
        const validUrl = response.data.valid_url;
        const status = response.data.status;

        if (status !== 'error') {
            if ((isHttpsRequired && httpCheck) || !isHttpsRequired) {
                navigation.navigate('WebView', {
                    url: `${validUrl}${urlParams}`,
                    showHeader: !isHeaderEnabled,
                    isAutoRotationEnabled: isAutoRotationEnabled,
                });
            } else {
                setPopup({ 
                    visible: true, 
                    title: 'Error', 
                    message: 'The URL is not HTTPS-compliant.', 
                    onCancel: () => setPopup(prev => ({ ...prev, visible: false })) 
                });
            }
        } else {
            setPopup({ 
                visible: true, 
                title: 'Error', 
                message: response.data.error || 'Invalid URL.', 
                onCancel: () => setPopup(prev => ({ ...prev, visible: false })) 
            });
        }
    } catch (error) {
        console.error('Error during API call:', error.response || error);
        setPopup({ 
            visible: true, 
            title: 'Error', 
            message: 'Failed to validate the URL.', 
            onCancel: () => setPopup(prev => ({ ...prev, visible: false })) 
        });
    } finally {
        setLoadingWebView(false);
    }
};




  const handleOpenInSafari = async () => {
    setLoadingSafari(true);
    const fullUrl = `${baseUrl}${urlParams}`;
    try {
      await Linking.openURL(fullUrl);
    } catch (err) {
      Alert.alert('Error', 'Failed to open URL in Safari.');
    } finally {
      setLoadingSafari(false);
    }
  };

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      StatusBar.setBarStyle(newTheme === 'dark' ? 'light-content' : 'dark-content');
      AsyncStorage.setItem('theme', newTheme).catch(error => console.error('Error saving theme:', error));
      return newTheme;
    });
  };

  const isDarkTheme = theme === 'dark';

  return (
    <View

      style={[
        styles.container,
        { backgroundColor: isDarkTheme ? '#000' : '#fff' },
      ]}
    >
      <CustomPopup
        visible={popup.visible}
        title={popup.title}
        message={popup.message}
        onCancel={popup.onCancel}
        onConfirm={popup.onConfirm}
      />
      {/* Theme Toggle Icon */}
      <TouchableOpacity
        style={styles.themeToggle}
        onPress={toggleTheme}
      >
        <FadeInView duration={350}>
          <Icon
            name={isDarkTheme ? 'sunny' : 'moon'}
            size={24}
            color={isDarkTheme ? '#ffcc00' : '#000'}
          />
        </FadeInView>
      </TouchableOpacity>

      {/* Dodo Logo Image */}
      <FadeInView duration={350}>
        <Image
          source={require('./assets/2025_Transparant-15.png')}
          style={styles.logo}
          resizeMode="contain"
        /> 
      </FadeInView>

      <FadeInView duration={350}>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkTheme ? '#202020' : '#fff',
                color: isDarkTheme ? '#fff' : '#000',
              },
            ]}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="Enter Base URL"
            placeholderTextColor={isDarkTheme ? '#aaa' : '#888'}
          />
        </View>
      </FadeInView>

      <FadeInView duration={350}>
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDarkTheme ? '#202020' : '#fff',
                color: isDarkTheme ? '#fff' : '#000',
              },
            ]}
            value={urlParams}
            onChangeText={setUrlParams}
            placeholder="Enter URL Parameters"
            placeholderTextColor={isDarkTheme ? '#aaa' : '#888'}
          />
        </View>
      </FadeInView>

      <FadeInView duration={350}>

        <View style={styles.switchContainer}>
          <View style={styles.switchRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="fullscreen" size={26} style={{ color: isDarkTheme ? '#fff' : '#000' }} />
              <Text style={{ color: isDarkTheme ? '#fff' : '#000', marginLeft: 10 }}>
                Full Screen
              </Text>
            </View>
            <Switch
              value={isHeaderEnabled}
              onValueChange={handleToggleHeader}
              trackColor={{ true: '#F15A29', false: 'gray' }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="autorenew" size={24} style={{ color: isDarkTheme ? '#fff' : '#000' }} />
              <Text style={{ color: isDarkTheme ? '#fff' : '#000', marginLeft: 10 }}>
                Auto Rotation
              </Text>
            </View>
            <Switch
              value={isAutoRotationEnabled}
              onValueChange={handleToggleAutoRotation}
              trackColor={{ true: '#F15A29', false: 'gray' }}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="https" size={22} style={{ color: isDarkTheme ? '#fff' : '#000' }} />
              <Text style={{ color: isDarkTheme ? '#fff' : '#000', marginLeft: 10 }}>
                HTTPS
              </Text>
            </View>
            <Switch
              value={isHttpsRequired}
              onValueChange={handleToggleHttps}
              trackColor={{ true: '#F15A29', false: 'gray' }}
            />
          </View>
        </View>
      </FadeInView>


      <FadeInView duration={350}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => handleOpenWebView(baseUrl, urlParams)}
          disabled={isLoadingWebView}
        >
          {isLoadingWebView ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text
              style={[
                styles.buttonText,
                { color: isDarkTheme ? '#fff' : '#fff' },
              ]}
            >
              Open WebView
            </Text>
          )}
        </TouchableOpacity>
      </FadeInView>

      <FadeInView duration={350}>
        <TouchableHighlight
          style={styles.button2}
          onPress={handleOpenInSafari}
          disabled={isLoadingSafari}
        >
          {isLoadingSafari ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.buttonText2}>Open in Safari</Text>
          )}
        </TouchableHighlight>
      </FadeInView>

    </View>
  );
};

const WebViewScreen = ({ route, navigation }) => {
  const { url, showHeader, isAutoRotationEnabled } = route.params;
  const [isAdPage, setIsAdPage] = useState(false);

  const webViewRef = useRef(null); // Ref to reload the same page

  useEffect(() => {
    if (showHeader) {
      StatusBar.setHidden(false);
    } else {
      StatusBar.setHidden(true);
    }

    if (isAutoRotationEnabled) {
      ScreenOrientation.unlockAsync();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }

    return () => {
      StatusBar.setHidden(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    };
  }, [showHeader, isAutoRotationEnabled]);

  const handleNavigationStateChange = (navState) => {
    // Check if the URL matches the specific ad link
    if (navState.url.startsWith('https://user')) {
      Linking.openURL(navState.url).catch((err) => console.error('Error opening URL:', err));
      return false; // Prevent WebView from navigating to this URL
    }
  };


  return (
    <View style={{ flex: 1 }}>
      {showHeader && (
        <SafeAreaView style={styles.header}>
        </SafeAreaView>
      )}
      <WebView
        source={{ uri: url }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        mediaPlaybackRequiresUserAction={false}  // Automatically play media
        allowsInlineMediaPlayback={true}         // Allow inline playback for videos
        javaScriptEnabled={true}                  // Enable JavaScript for interactive content
        domStorageEnabled={true}                  // Enable DOM storage
        prefersHomeIndicatorAutoHidden={true}     // Hide the home indicator
        contentInsetAdjustmentBehavior="never"    // Prevent safe area adjustment
        allowUniversalAccessFromFileURLs={true}   // Allow file URLs to access data
        useWebKit={true}
        onNavigationStateChange={handleNavigationStateChange}
      />
    </View>
  );
};

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ autoHideHomeIndicator: true }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="WebView"
          component={WebViewScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 90,
  },
  header: {
    height: 50,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  themeToggle: {
    position: 'absolute',
    top: 50,
    right: 10,
    zIndex: 10,
    padding: 10,
  },

  logo: {
    width: 200,
    height: 150,
    alignSelf: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  switchContainer: {
    marginBottom: 30,
    marginTop: 25,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#F15A29',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    alignSelf: 'center',
  },
  button2: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    alignSelf: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonText2: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
  header: {
    height: 50,
    backgroundColor: '#F15A29',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popupContainer: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#f15a29',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelText: {
    color: '#f15a29',
    fontSize: 16,
    fontWeight: 'bold',
  },
  proceedButton: {
    flex: 1,
    backgroundColor: '#f15A29',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  proceedText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;