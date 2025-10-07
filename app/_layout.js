import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from "react-native";
import { useRouter, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';



const Layout = () => {
    const router = useRouter();
    const pathname = usePathname(); // Obține calea curentă
    
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                const response = await fetch('http://89.37.212.9:3000/user', {
                    headers: { token }
                });
                const data = await response.json();
                
                if (response.ok) {
                    setName(data.user.nume);
                    setEmail(data.user.email);
                    setTelefon(data.user.telefon);
                } else {
                    Alert.alert('Eroare', 'Nu s-au putut prelua datele');
                }
            } catch (error) {
                Alert.alert('Eroare', 'Problema la conectarea cu serverul');
            }
        };

        fetchUserData();
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                if (!pathname.substring(1).includes('/')) { // Blochează doar paginile din `app/`
                    return true;
                }
                return false;
            }
        );

        return () => backHandler.remove();
    }, [pathname]);
    return (
        <Tabs screenOptions={({ route }) => ({
            tabBarStyle: ["index", "salonmanager"].includes(route.name) ? { display: "none" } : {},

            tabBarActiveTintColor: "rgb(255, 194, 73)"


        })}>
            <Tabs.Screen name="index" options={{ href: null }} />
            <Tabs.Screen name="home"
                options={{
                    title: "Acasa",
                    headerTitle: "Let`s GlowApp",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen name="programariclient"
                options={{
                    title: "Programari",
                    headerTitle: "Programarile tale",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen name="loyality"
                options={{
                    title: "Loialitate",
                    headerTitle: "Loialitate",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="star" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen name='accmenu' options={{
                title: "Contul Meu",
                headerTitle: "Contul meu",
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="person-circle-outline" size={size} color={color} />
                ),
            }} />
            <Tabs.Screen name='salonmanager' options={{
                headerShown: false,
                href: null,
                title: "Salonul meu",
                headerTitle: "Salonul meu",
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="business" size={size} color={color} />
                ),
            }} />

        </Tabs>
    )
}

export default Layout;