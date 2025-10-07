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
            <Tabs.Screen name='adddepart' options={{
                    
                    title: "Adauga departament",
                    headerTitle: " Adauga departament",
                    tabBarButton: () => null, 
                    headerLeft: () => (
                        <Pressable onPress={() => router.replace('/salonmanager/servicii')} style={{ marginLeft: 10 }}>
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </Pressable>
                    ),
                    tabBarStyle: { display: "none" }
                }}/>    
            
        </Tabs>
    )
}

export default Layout;