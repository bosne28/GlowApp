import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from "react-native";
import { useRouter } from 'expo-router';


const Layout = () => {
        const router = useRouter();
    
    return (
        <Tabs screenOptions={({ route }) => ({
            tabBarStyle: { display: "none" } , 
          })}>
            <Tabs.Screen name="index" options={{ href: null, headerShown: false}} />
            <Tabs.Screen name='accdata' options={{
                    headerStyle: {height:40},
                    title: "Administrare cont",
                    headerTitle: " Administrare cont",
                    tabBarButton: () => null, 
                    headerLeft: () => (
                        <Pressable onPress={() => router.replace('/accmenu')} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </Pressable>
                    ),
                    tabBarStyle: { display: "none" }
                }}/>    
            <Tabs.Screen name='newpartener' options={{
                    headerStyle: {height:40},
                    title: "Inscriere partener",
                    headerTitle: " Inscriere partener",
                    tabBarButton: () => null, 
                    headerLeft: () => (
                        <Pressable onPress={() => router.replace('/accmenu')} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </Pressable>
                    ),
                    tabBarStyle: { display: "none" }
                }}/>    
        </Tabs>
    )
}

export default Layout;