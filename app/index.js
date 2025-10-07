import { useState, useEffect } from 'react'; // Import useEffect
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';
import {
    Text,
    View,
    TouchableOpacity,
    Image,
    TextInput,
    StyleSheet,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    BackHandler,
    Linking, Pressable, Alert} from 'react-native'; // Import Keyboard and KeyboardAvoidingView
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { Video } from 'expo-av';
import { useRouter } from 'expo-router';
export const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const NotLogged = () => {
    const router = useRouter();
    const checkTokenInDatabase = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('userToken');
    
            if (!storedToken) {
                console.log('Tokenul nu există local.');
                return;
            }
    
            const response = await fetch('http://89.37.212.9:3000/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: storedToken }) // Trimitem tokenul către server
            });
            
    
            const data = await response.json();
    
            if (response.ok) {
                console.log('Token valid! Utilizator:', data.nume);
                if(data.nume === null)
                    // Navighează către home
                    router.replace('/accmenu/accdata');
                else router.replace('/home'); // Navigăm dacă tokenul e valid
            } else {
                console.log('Token invalid:', data.error);
                // Poți șterge tokenul dacă e invalid
                await AsyncStorage.removeItem('userToken');
            }
        } catch (error) {
            console.error('Eroare la verificarea tokenului:', error);
        }
    };
    const [isButtonVisible, setIsButtonVisible] = useState(true);
    const [isLoginVisible, setIsLoginVisible] = useState(false);
    const [isNewAccount, setIsNewAccount] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const heightOfLoginView = useSharedValue('0%');
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [telefon, setTelefon] = useState("");
    const [passConfirm, setPassConfirm] = useState("")
    const [isChecked, setChecked] = useState(false);
    const animatedStyle = useAnimatedStyle(() => ({
        height: withTiming(heightOfLoginView.value, { duration: 300 }),
    }));

    const handleCloseLogin = async () => {
        heightOfLoginView.value = '0%';
        setIsButtonVisible(true);
        await delay(200);
        setIsLoginVisible(false);
    };

    // Adaugă ascultători pentru evenimentele tastaturii
    useEffect(() => {
        checkTokenInDatabase();
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setIsKeyboardVisible(true); // Setează vizibilitatea tastaturii pe true
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setIsKeyboardVisible(false); // Setează vizibilitatea tastaturii pe false
        });
        const backAction = () => {
            if (isNewAccount) {
                setIsNewAccount(false);
                return true; // Împiedică comportamentul implicit al butonului de back
            }
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );
        // Curăță ascultătorii
        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
            backHandler.remove();
        };
    }, []);

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />
            <Video
                source={require("../assets/images/introvid.mp4")}
                style={styles.backgroundVideo}
                muted
                isLooping
                resizeMode="cover"
                rate={1.0}
                shouldPlay
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Gestionează comportamentul tastaturii
                style={styles.container}
            >
                <View style={styles.container}>
                    {isLoginVisible && (
                        <Animated.View style={[styles.loginContainer, animatedStyle]}>
                            {!isNewAccount && (
                                <TouchableOpacity style={styles.closeButton} onPress={handleCloseLogin}>
                                    <Text style={styles.closeButtonText}>×</Text>
                                </TouchableOpacity>
                            )}
                            {/* Afișează condițional imaginea lacătului */}
                            {!isKeyboardVisible && !isNewAccount && (
                                <Image
                                    source={require("../assets/images/lock.png")}
                                    style={styles.lockImage}
                                />
                            )}
                            <Text style={styles.label}>Utilizator:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="eMail"
                                autoCapitalize='none'
                                inputMode='email'
                                onChangeText={text => setEmail(text)}
                            />
                            <Text style={styles.label}>Parolă:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Parola"
                                autoCapitalize='none'
                                onChangeText={(text) => setPassword(text)}
                                secureTextEntry
                            />
                            {isNewAccount && (
                                <>
                                    <TouchableOpacity style={styles.backButton} onPress={() => setIsNewAccount(false)}>
                                        <Text style={styles.backButtonText}>←</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.label}>Confirmă parola:</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Confirmă parola"
                                        autoCapitalize='none'
                                        secureTextEntry
                                        onChangeText={
                                            (text) => setPassConfirm(text)
                                        }
                                    />
                                    <Text style={styles.label}>Număr de telefon:</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        maxLength={10}
                                        placeholder="07*********"
                                        onChangeText={(text) => setTelefon(text)}

                                    />
                                </>
                            )}
                            {!isNewAccount && (
                                <TouchableOpacity style={styles.loginButton} onPress={async () => {
                                        // Verifică credențialele (înlocuiește cu logica ta)
                                        const response = await fetch('http://89.37.212.9:3000/login', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                                email,
                                                password,
                                            }),
                                        });

                                        const result = await response.json();

                                        if (response.ok) {
                                            // Salvează token-ul în AsyncStorage
                                            console.log(result.nume);
                                            await AsyncStorage.setItem('userToken', result.token);
                                            if(result.nume === null)
                                            // Navighează către home
                                            router.replace('/accmenu/accdata');
                                            else router.replace('/home');
                                        } else {
                                            Alert.alert('Eroare', result.error || 'Date de logare invalide');
                                        }
                                        
                                }}
                                >
                                    <Text style={styles.buttonText}>Intra in cont</Text>
                                </TouchableOpacity>
                            )}
                            <View style={{
                                display: 'flex',

                            }}>
                                {(!(email.includes('@')) || (email.length < 6)) && isNewAccount &&
                                    <Text style={styles.eroareLogare}>* Introduceti o adresa email valida</Text>
                                }
                                {password.length < 8 && isNewAccount &&
                                    <Text style={styles.eroareLogare}>* Parola trebuie sa conțină minim un caracter numeric și să fie mai lungă de 8 caractere</Text>
                                }

                                {!(passConfirm === password) && isNewAccount &&
                                    <Text style={styles.eroareLogare}>Parolele nu se potrivesc</Text>
                                }

                                {isNewAccount &&

                                    <View style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        top: '8',
                                    }}>
                                        <Checkbox
                                            value={isChecked}
                                            onValueChange={setChecked}
                                            color={isChecked ? '#000000' : '#ffffff'}
                                            style={{
                                                backgroundColor: 'white'
                                            }}
                                        />
                                        <Text >   Sunt de acord cu{' '}
                                            <Pressable onPress={async () => {
                                                Linking.openURL('https://pdf.url')
                                            }}>
                                                <Text style={{ top: '4', color: 'blue', textDecorationLine: 'underline' }}>
                                                    Termenii și condițiile
                                                </Text>
                                            </Pressable>
                                        </Text>

                                    </View>}
                            </View>
                            <TouchableOpacity style={styles.signupButton} onPress={async () => {
                                if (isNewAccount === true) {
                                    // Validează datele înainte de trimitere
                                    if (!email || !telefon || !password) {
                                        Alert.alert('Eroare', 'Completati toate campurile!');
                                        return;
                                    }

                                    if (password !== passConfirm) {
                                        Alert.alert('Eroare', 'Parolele nu se potrivesc');
                                        return;
                                    }

                                    if (!isChecked) {
                                        Alert.alert('Eroare', 'Trebuie sa bifati acordul referitor la termeni si conditii');
                                        return;
                                    }

                                    try {
                                        // Trimite o cerere POST către server
                                        const response = await fetch('http://89.37.212.9:3000/register', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                                email,
                                                telefon,
                                                password,
                                            }),
                                        });

                                        const result = await response.json();

                                        if (response.ok) {
                                            Alert.alert('Succes', result.message);
                                            // Opțional, navighează către alt ecran sau resetează formularul
                                        } else {
                                            Alert.alert('Eroare', result.error || result.message || 'Ceva nu a funcționat corect.');
                                        }
                                    } catch (error) {
                                        Alert.alert('Eroare', error.message || 'Ceva nu a funcționat corect.');
                                    }
                                } else {
                                    setIsNewAccount(true);
                                }
                            }}
                            >
                                <Text style={styles.buttonText}>Creeaza cont</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {isButtonVisible && (
                        <TouchableOpacity
                            style={styles.connectButton}
                            onPress={() => {
                                setIsButtonVisible(false);
                                setIsLoginVisible(true);
                                heightOfLoginView.value = '75%';
                            }}
                        >
                            <Text style={styles.connectButtonText}>Conectează-te</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eroareLogare: {
        color: 'red',

    },
    loginContainer: {
        position: 'absolute',
        bottom: '10%',
        width: '90%',
        backgroundColor: 'rgba(214, 174, 192, 0.86)',
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        overflow: 'hidden',
    },
    backgroundVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        width: 40,
        height: 40,
        top: '5%',
        right: '5%',
        backgroundColor: 'rgb(255, 255, 255)',
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        color: 'black',
        fontSize: 20,
        fontWeight: 'bold',
    },
    lockImage: {
        position: 'absolute',
        top: '3%',
        width: '20%',
        height: '15%',
        resizeMode: 'contain',
    },
    label: {
        alignSelf: 'flex-start',
        marginLeft: '15%',
        marginTop: 10,
    },
    input: {
        width: '70%',
        backgroundColor: 'rgb(255, 255, 255)',
        borderWidth: 0.1,
        borderRadius: 23,
        paddingLeft: 15,
        marginBottom: 10,
    },
    backButton: {
        position: 'absolute',
        width: 40,
        height: 40,
        top: '5%',
        right: '5%',
        backgroundColor: 'rgb(255, 255, 255)',
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: {
        color: 'black',
        fontSize: 20,
        fontWeight: 'bold',
        top: -4,
    },
    loginButton: {
        width: '80%',
        height: 50,
        backgroundColor: 'rgb(255, 255, 255)',
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    signupButton: {
        width: '80%',
        height: 50,
        backgroundColor: 'rgb(255, 255, 255)',
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        top: 10,
    },
    buttonText: {
        color: 'black',
        fontSize: 20,
        fontWeight: 'bold',
    },
    connectButton: {
        position: 'absolute',
        bottom: '10%',
        width: '80%',
        backgroundColor: 'rgb(214, 174, 192)',
        borderRadius: 23,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    connectButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textShadowColor: 'grey',
        textShadowRadius: 1,
        textShadowOffset: {
            width: 1,
            height: 1,
        },
    },
});

export default NotLogged;