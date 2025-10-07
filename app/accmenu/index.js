import { useState, useEffect } from 'react'; // Import useEffect
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';
import Ionicons from '@expo/vector-icons/Ionicons';
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
    Linking, Pressable, Alert,
} from 'react-native'; // Import Keyboard and KeyboardAvoidingView
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { Video } from 'expo-av';
import { useRouter } from 'expo-router';
import { Tabs } from 'expo-router';


const AccMenu = () => {
    const router = useRouter();
    const [partener, setPartener] = useState('');
    const deleteSalon = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch('http://89.37.212.9:3000/salon', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Token': token
                }
            });
    
            const result = await response.json();
            if (response.ok) {
                Alert.alert('Succes', 'Salonul a fost eliminat!');
            } else {
                Alert.alert('Eroare', result.error);
            }
        } catch (error) {
            Alert.alert('Eroare', 'Problema la conectarea cu serverul');
        }
    };
    const verifyPartener = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            console.log("Token utilizator:", token);

            if (!token) {
                Alert.alert('Eroare', 'Token lipsă!');
                return;
            }

            const response = await fetch('http://89.37.212.9:3000/user', {
                headers: { token }
            });
            const data = await response.json();

            if (response.ok) {
                if (data.user.partenerID != null) {
                    setPartener(data.user.partenerID);
                }
                else setPartener('');
                console.log("Partener ID:", data.user.partenerID);
            } else {
                Alert.alert('Eroare', 'Nu s-au putut prelua datele');
            }
        } catch (error) {
            Alert.alert('Eroare', 'Problema la conectarea cu serverul');
        }
    };

    useFocusEffect(() => {
        verifyPartener();
    });
    return (
        <>
            <View style={styles.container}>
                <TouchableOpacity
                    style={[styles.menuTile, { borderTopStartRadius: 20, borderTopEndRadius: 20 }]}
                    onPress={() => {
                        router.push('/accmenu/accdata');
                    }}
                >
                    <Ionicons name="finger-print" size={25} />
                    <Text style={styles.connectButtonText}>Administrare cont</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.menuTile}
                    onPress={() => {

                    }}
                >
                    <Ionicons name="time" size={25} />
                    <Text style={styles.connectButtonText}>Istoric client</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.menuTile, { borderBottomWidth: 0, borderBottomStartRadius: 20, borderBottomEndRadius: 20 }]}
                    onPress={() => {

                    }}
                >
                    <Ionicons name="help-circle-outline" size={25} />
                    <Text style={styles.connectButtonText}>Despre aplicatie</Text>
                </TouchableOpacity>
            </View>
            {!partener && (
                <View style={styles.container}>
                    <TouchableOpacity
                        style={[styles.menuTile, { borderRadius: 20, borderBottomWidth: 0 }]}
                        onPress={() => {
                            router.push('/accmenu/newpartener');
                        }}
                    >
                        <Ionicons name="business" size={25} />
                        <Text style={styles.connectButtonText}>Vreau sa fiu partener!</Text>
                    </TouchableOpacity>
                </View>)
                }
                {partener && (
                <View style={styles.container}>
                    <TouchableOpacity
                        style={[styles.menuTile, { borderTopStartRadius: 20, borderTopEndRadius: 20}]}
                        onPress={() => {
                            router.replace('/salonmanager');
                        }}
                    >
                        <Ionicons name="business" size={25} />
                        <Text style={styles.connectButtonText}>Salonul meu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
    style={[
        styles.menuTile,
        { borderBottomWidth: 0, borderBottomStartRadius: 20, borderBottomEndRadius: 20 }
    ]}
    onPress={async () => {
        await deleteSalon();
        verifyPartener();
        router.replace('/accmenu');
    }}
>
<Ionicons name="trash" size={25} />
<Text style={styles.connectButtonText}>Incheie parteneriatul</Text>
</TouchableOpacity>

                </View>)
                }
            <TouchableOpacity style={styles.logoutButton} onPress={async () => {
                try {
                    // Șterge tokenul din AsyncStorage
                    await AsyncStorage.removeItem('userToken');
                    console.log('Tokenul a fost șters.');

                    // Navighează înapoi la pagina principală
                    router.replace('/');
                } catch (error) {
                    console.error('Eroare la delogare:', error);
                }
            }}>
                <Ionicons name="log-out" size={25} color='white' />

                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Iesi din cont</Text>
            </TouchableOpacity>
        </>
    );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        padding: 20,
        margin: 10,
    },
    menuTile: {
        flexDirection: 'row',
        alignItems: "center",
        height: 60,
        width: '100%',
        backgroundColor: 'rgb(255, 255, 255)',
        borderBottomColor: 'rgba(27, 26, 26, 0.69)',
        borderBottomWidth: 2,
        paddingLeft: 15,
        gap: 30,
    },
    logoutButton: {
        position: 'absolute',
        flexDirection: 'row',
        width: '80%',
        height: 50,
        backgroundColor: 'rgba(255, 0, 0, 0.69)',
        borderRadius: 20,
        bottom: 30,
        paddingLeft: 15,
        alignItems: "center",
        left: '10%',
        gap: 30,
        paddingLeft: 15,

    },
});
export default AccMenu;