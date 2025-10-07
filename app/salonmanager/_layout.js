import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from "react-native";
import { useRouter } from 'expo-router';
import { View } from 'react-native';
const Layout = () => {
    const router = useRouter();

    return (
        <Tabs screenOptions={({ route }) => ({
            tabBarStyle: ["(modal)"].includes(route.name) ? { display: "none" } : {},

        })}>
            <Tabs.Screen name="index" options={{
                title: "Salonul meu",
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="business" size={size} color={color} />
                ),
                headerTitle: "Salonul meu",
            }} />
            <Tabs.Screen name='servicii' options={{
                title: "Servicii",
                headerTitle: "Servicii",
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="list-outline" size={size} color={color} />
                ),
            }} />
            <Tabs.Screen name='programari' options={{
                title: "Programări",
                headerTitle: "Programări clienți",
                tabBarIcon: ({ color, size }) => (
                    <Ionicons name="calendar-outline" size={size} color={color} />
                ),
            }} />
            <Tabs.Screen name="backhome" options={{ 
                title:"Acasa",
                headerShown: false,
                tabBarIcon: ({ color, size }) => (
                    <View style={{}}>
                      <Ionicons name="home" size={size/1.2} color={color} style={{ marginTop: 7 }}/>
                      <Ionicons name="return-down-back-outline" size={size} color={color}  style={{ marginTop: -10 }}/>

                    </View>
                  )
                  , }} />
            <Tabs.Screen name="(modal)" options={{
                href: null,
                animation: 'fade',
                headerShown: false,
            }} />

        </Tabs>
    )
}

export default Layout;
