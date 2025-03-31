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
  Animated
} from 'react-native';
import WebView from 'react-native-webview';
import Constants from "expo-constants";
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
import Entypo from '@expo/vector-icons/Entypo';

const HomeScreen = ({ navigation }) => {
  const [isHeaderEnabled, setHeaderEnabled] = useState(false);
  const [isAutoRotationEnabled, setAutoRotationEnabled] = useState(false);
  const [isHttpsRequired, setHttpsRequired] = useState(false);
  const [theme, setTheme] = useState('light');
  const [isLoadingWebView, setLoadingWebView] = useState(false);
  const [isLoadingSafari, setLoadingSafari] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [urlParams, setUrlParams] = useState('');
  const [popup, setPopup] = useState({ visible: false, title: '', message: '', onCancel: null, onConfirm: null });
  const [popup2, setPopup2] = useState({ visible: false, title: '', message: '', onCancel: null, onConfirm: null });


  const CustomPopup = ({ visible, title, message, onCancel, onConfirm }) => {

    return (
      <Modal transparent visible={visible} animationType='fade'>
        <View style={styles.modalBackground}>
          <View style={styles.popupContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.proceedButton} onPress={onConfirm}>
                <Text style={styles.proceedText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  const CustomPopup2 = ({ visible, title, message, onCancel, onConfirm }) => {

    return (
      <Modal transparent visible={visible} animationType='fade'>
        <View style={styles.modalBackground}>
          <View style={styles.popupContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.proceedButton} onPress={onConfirm}>
                <Text style={styles.proceedText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  };

  useFocusEffect(
    useCallback(() => {
      let timeoutId;

      const lockPortrait = async () => {
        try {
          // Lock orientation hard
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

          // Fallback lock in case it still rotates
          timeoutId = setTimeout(() => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          }, 500);
        } catch (e) {
          console.warn('Error forcing portrait on Home screen:', e);
        }
      };
      StatusBar.setHidden(true, 'fade');

      lockPortrait();

      return () => clearTimeout(timeoutId);
    }, [])
  );

  const saveSettings = async (baseUrl, urlParams) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify({ baseUrl, urlParams }));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const clearStorage = async () => {
    try {
      await AsyncStorage.clear();
      console.log('Local storage cleared');
    } catch (error) {
      console.error('Error clearing local storage:', error);
    }
  };

  // // Call this function when needed
  // clearStorage();



  const saveSwitchSettings = async (newSettings) => {
    try {
      const existingSettings = await AsyncStorage.getItem('switchSettings');
      const parsedSettings = existingSettings ? JSON.parse(existingSettings) : {};
      const updatedSettings = { ...parsedSettings, ...newSettings };
      await AsyncStorage.setItem('switchSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving switch settings:', error);
    }
  };

  const handleToggleHeader = (value) => {
    setHeaderEnabled(value);
    saveSwitchSettings({ isHeaderEnabled: value });
  };

  const handleToggleAutoRotation = async (value) => {
    setAutoRotationEnabled(value);
    await saveSwitchSettings({ isAutoRotationEnabled: value });
    // Wait for state to update before checking orientation
    if (value) {
      setPopup2({
        visible: true,
        title: 'Lock Orientation Mode',
        message: 'If you want to ON auto rotation, just turn off your Lock orientation Mode from Device Settings',
        onConfirm: async () => {
          setPopup2(prev => ({ ...prev, visible: false }));
        },
      });
    }
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

      let baseUrl = 'https://google.com', urlParams = '';
      let isHeaderEnabled = false, isAutoRotationEnabled = false, isHttpsRequired = false;


      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        baseUrl = parsedSettings.baseUrl || '';
        urlParams = parsedSettings.urlParams || '';
      }

      if (switchSettings) {
        const parsedSwitches = JSON.parse(switchSettings);
        isHeaderEnabled = parsedSwitches.isHeaderEnabled ?? false;
        isAutoRotationEnabled = parsedSwitches.isAutoRotationEnabled ?? false;
        isHttpsRequired = parsedSwitches.isHttpsRequired ?? false;
      }

      console.log("Load isAutoRotation", isAutoRotationEnabled);


      setBaseUrl(baseUrl);
      setUrlParams(urlParams);
      setHeaderEnabled(isHeaderEnabled);
      setAutoRotationEnabled(isAutoRotationEnabled);
      setHttpsRequired(isHttpsRequired);



      if (baseUrl || urlParams) {
        if (baseUrl != 'https://google.com') {
          setPopup({
            visible: true,
            title: 'Open Previous Website',
            message: 'Do you want to open the previously saved website?',
            onCancel: () => {
              setLoadingWebView(false);
              setPopup(prev => ({ ...prev, visible: false }));
            },
            onConfirm: async () => {
              setPopup(prev => ({ ...prev, visible: false }));
              await validateAndNavigate(baseUrl, urlParams, isHeaderEnabled, isAutoRotationEnabled, isHttpsRequired);
            },
          });
        }
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
      let isHeaderEnabled = false, isAutoRotationEnabled = false, isHttpsRequired = false;

      if (switchSettings) {
        const parsedSwitches = JSON.parse(switchSettings);
        isHeaderEnabled = parsedSwitches.isHeaderEnabled ?? false;
        isAutoRotationEnabled = parsedSwitches.isAutoRotationEnabled ?? false;
        isHttpsRequired = parsedSwitches.isHttpsRequired ?? false;
      }


      console.log("Opening WebView with settings:");
      console.log("Header Enabled:", isHeaderEnabled);
      console.log("Auto Rotation Enabled:", isAutoRotationEnabled);
      console.log("HTTPS Required:", isHttpsRequired);

      const fullUrl = `${baseUrl}${urlParams}`;
      console.log("Full URL -", fullUrl);

      if (!baseUrl) {
        setPopup2({
          visible: true, title: 'Error', message: 'Invalid URL. Please enter a valid base URL.'
          , onConfirm: async () => {
            setPopup2(prev => ({ ...prev, visible: false }));
          },
        });
        setLoadingWebView(false);
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
          setPopup2({
            visible: true,
            title: 'Error',
            message: 'The URL is not HTTPS-compliant.',
            onConfirm: async () => {
              setPopup2(prev => ({ ...prev, visible: false }));
            }
          });
        }
      } else {
        setPopup2({
          visible: true,
          title: 'Enable Https',
          message: response.data.error || 'Invalid URL.',
          onConfirm: async () => {
            setPopup2(prev => ({ ...prev, visible: false }));
          }
        });
      }
    } catch (error) {
      console.error('Error during API call:', error.response || error);
      setPopup2({
        visible: true,
        title: 'Error',
        message: 'Failed to validate the URL.',
        onConfirm: async () => {
          setPopup2(prev => ({ ...prev, visible: false }));
        }
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
      // Alert.alert('Error', 'Failed to open URL in Safari.');
      setPopup2({
        visible: true,
        title: 'Error',
        message: 'Failed to open URL in Safari.',
        onConfirm: async () => {
          setPopup2(prev => ({ ...prev, visible: false }));
        },
      });

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

      <CustomPopup2
        visible={popup2.visible}
        title={popup2.title}
        message={popup2.message}
        onCancel={popup2.onCancel}
        onConfirm={popup2.onConfirm}
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
  const webViewRef = useRef(null);
  const [isPortrait, setIsPortrait] = useState(true); // Track orientation
  const [isButtonVisible, setButtonVisible] = useState(true); // Track button visibility 
  const timerRef = useRef(null); // Store reference to timeout 
  const [canGoBack, setCanGoBack] = useState(false);
  const [shouldRenderButton, setShouldRenderButton] = useState(false);
  const buttonPosition = useRef(new Animated.Value(100)).current; // Start off-screen
  const isMounted = useRef(true);
  const isPortraitRef = useRef(isPortrait);

    // Sync ref with portrait state
    useEffect(() => {
      isPortraitRef.current = isPortrait;
    }, [isPortrait]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Button animation handler
  useEffect(() => {
    if (!isMounted.current) return;

    const showButton = isButtonVisible && isPortraitRef.current;
    
    if (showButton) {
      setShouldRenderButton(true);
      Animated.spring(buttonPosition, {
        toValue: 0,
        speed: 20,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(buttonPosition, {
        toValue: 100,
        speed: 20,
        useNativeDriver: true,
      }).start(() => {
        if (isMounted.current && !isButtonVisible) {
          setShouldRenderButton(false);
        }
      });
    }

    return () => buttonPosition.stopAnimation();
  }, [isButtonVisible, isPortrait]);

    // Orientation change handler
    useEffect(() => {
      if (!isPortrait) {
        // Immediately hide button when switching to landscape
        setButtonVisible(false);
      }
    }, [isPortrait]);

  // Update navigation options based on canGoBack state
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !canGoBack, // Only enable React Navigation gesture when no web history
    });
  }, [canGoBack, navigation]);



  useFocusEffect(
    useCallback(() => {
      const applyOrientationSetting = async () => {
        try {
          const switchSettings = await AsyncStorage.getItem('switchSettings');
          const parsed = switchSettings ? JSON.parse(switchSettings) : {};
          const autoRotation = parsed.isAutoRotationEnabled ?? false;

          if (autoRotation) {
            await ScreenOrientation.unlockAsync();
          } else {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          }
        } catch (e) {
          console.error('Orientation error on WebView screen:', e);
        }
      };

      applyOrientationSetting();
    }, [])
  )

  // Function to check current orientation
  const checkOrientation = async () => {
    const orientation = await ScreenOrientation.getOrientationAsync();
    setIsPortrait(
      orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
      orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
    );
  };

  const hideButtonAfterTimeout = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (isMounted.current) setButtonVisible(false);
    }, 3000);
  };

  const handleUserInteraction = () => {
    if (!isButtonVisible && isMounted.current) {
      setButtonVisible(true);
    }
    hideButtonAfterTimeout();
  };


  StatusBar.setBarStyle('light-content'); // Set status bar text color to white

  useEffect(() => {
    if (showHeader) {
      StatusBar.setHidden(true);
    } else {
      StatusBar.setHidden(false);
    }
  }, []);



  useEffect(() => {

    // Check initial orientation
    checkOrientation();

    // Subscribe to orientation changes
    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      const newOrientation = event.orientationInfo.orientation;
      setIsPortrait(
        newOrientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
        newOrientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
      );
    });

    // Start the timeout to hide the button after 3 seconds of inactivity
    hideButtonAfterTimeout();

    StatusBar.setHidden(!showHeader || !isPortrait); // Hide if not portrait


    return () => {
      StatusBar.setHidden(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, [showHeader, isAutoRotationEnabled]);

  const handleShouldStartLoadWithRequest = (event) => {
    // Check if the URL starts with "https://user"
    if (event.url.startsWith('https://user')) {
      // Open in Safari instead of WebView
      Linking.openURL(event.url)
        .then(() => console.log('Opened in external browser'))
        .catch((err) => console.error('Error opening URL:', err));

      // Force WebView to stay on the original page
      if (webViewRef.current) {
        webViewRef.current.stopLoading(); // Prevents the error page
        webViewRef.current.reload(); // Reloads the correct page
      }

      return false; // Block WebView from loading this URL
    }

    return true; // Allow other URLs (e.g., https://google.com) to load in WebView
  };

  console.log("portrait -", isPortrait)
  // const UserAgent = WebView.new(request.user_agent)

  const [userAgent, setUserAgent] = useState("");

  useEffect(() => {
    const fetchUserAgent = async () => {
      try {
        const defaultUserAgent = await Constants.getWebViewUserAgentAsync();
        setUserAgent(defaultUserAgent + " /os.gatuIOS v1.0");
      } catch (error) {
        console.log("Error fetching user agent:", error);
      }
    };

    fetchUserAgent();
  }, []);


  return (
    <View style={{ flex: 1 }} onTouchStart={handleUserInteraction}>
      {showHeader && isPortrait && <SafeAreaView style={styles.header} />} 
      
      <WebView
        key={url}
        ref={webViewRef}
        source={{ uri: url }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={!showHeader}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        prefersHomeIndicatorAutoHidden={true}
        contentInsetAdjustmentBehavior="never"
        allowUniversalAccessFromFileURLs={true}
        allowsBackForwardNavigationGestures={true}
        bounces={false}
        userAgent={userAgent}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
      />
      {shouldRenderButton && (
        <Animated.View style={[
          styles.floatingButton,
          { transform: [{ translateX: buttonPosition }] }
        ]}>
          <TouchableOpacity
            style={styles.buttonContent}
            onPress={() => navigation.popToTop()}
          >
            <Entypo name="home" size={20} color="white" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};



const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{
        gestureEnabled: true,
        gestureResponseDistance: 30,
      }}>
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
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.17,
    shadowRadius: 3.05,
    elevation: 4
  },
  button2: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    alignSelf: 'center',
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.17,
    shadowRadius: 3.05,
    elevation: 4
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
    backgroundColor: '#333',
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
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 10,
    backgroundColor: 'black',
    borderRadius: 10, // Half of width/height for perfect circle
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // For Android shadow
    shadowColor: 'white', // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 7,
    padding: 5,
    opacity:0.7
  },
  buttonContent: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default App;