import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const AccountManagement = () => {
    const [name, setName] = useState('');
    const [telefon, setTelefon] = useState('');
    const [email, setEmail] = useState('');


    const router = useRouter();

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
    }, []);

    const handleSave = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await fetch('http://89.37.212.9:3000/userUpdate', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Token': `${token}`
                },
                body: JSON.stringify({ name, email, telefon })
            });

            const result = await response.json();
            if (response.ok) {
                Alert.alert('Succes', 'Datele au fost actualizate');
                router.replace('/accmenu')
                router.replace('/home');
            } else {
                Alert.alert('Eroare', result.error );
            }
        } catch (error) {
            Alert.alert('Eroare', 'Problema la conectarea cu serverul');
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <Text>Nume și Prenume:</Text>
            <TextInput value={name} onChangeText={setName} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
            <Text>Telefon:</Text>
            <TextInput value={telefon} onChangeText={setTelefon} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
            <Text>Email:</Text>
            <TextInput value={email} onChangeText={setEmail} style={{ borderBottomWidth: 1, marginBottom: 10 }} />

            <Button title="Salvează" onPress={handleSave} />
        </View>
    );
};

export default AccountManagement;
