import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

const ProgramariSalon = () => {
    const router = useRouter(); // Inițializare router

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.menuTile, { borderTopStartRadius: 20, borderTopEndRadius: 20 }]}
                onPress={() => router.push('/accmenu/accdata')}
            >
                <Ionicons name="finger-print" size={25} />
                <Text style={styles.connectButtonText}>Administrare cont</Text>
            </TouchableOpacity>
        </View>
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
});

export default ProgramariSalon;
