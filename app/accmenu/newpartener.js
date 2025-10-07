import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';

const NewPartener = () => {
    const router = useRouter();

    // State pentru câmpurile formularului
    const [CUI, setCUI] = useState('');
    const [firma, setFirma] = useState('');
    const [denumire, setDenumire] = useState('');
    const [adresa, setAdresa] = useState('');
    const [telefon, setTelefon] = useState('');
    const [email, setEmail] = useState('');
    const [program, setProgram] = useState('');

    const makePartener = async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert('Eroare', 'Token lipsă. Te rugăm să te autentifici din nou.');
                return;
            }

            const response = await fetch('http://89.37.212.9:3000/newpartener', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Token': token
                },
                body: JSON.stringify({ CUI, firma, denumire, adresa, telefon, email, program })
            });

            const result = await response.json();
            if (response.ok) {
                Alert.alert('Succes', 'Mulțumim pentru interesul acordat unui parteneriat!');
                router.replace('/accmenu');
            } else {
                Alert.alert('Eroare', result.error);
            }
        } catch (error) {
            Alert.alert('Eroare', 'Problema la conectarea cu serverul.');
        }
    };

    return (
        <ScrollView style={{ padding: 20 }}>
            <Text>CUI:</Text>
            <TextInput value={CUI} onChangeText={setCUI} style={{ borderBottomWidth: 1, marginBottom: 10 }} />

            <Text>Firma:</Text>
            <TextInput value={firma} onChangeText={setFirma} style={{ borderBottomWidth: 1, marginBottom: 10 }} />

            <Text>Denumire:</Text>
            <TextInput value={denumire} onChangeText={setDenumire} style={{ borderBottomWidth: 1, marginBottom: 10 }} />

            <Text>Adresă:</Text>
            <TextInput value={adresa} onChangeText={setAdresa} style={{ borderBottomWidth: 1, marginBottom: 10 }} />

            <Text>Telefon:</Text>
            <TextInput value={telefon} onChangeText={setTelefon} style={{ borderBottomWidth: 1, marginBottom: 10 }} />

            <Text>Email:</Text>
            <TextInput value={email} onChangeText={setEmail} style={{ borderBottomWidth: 1, marginBottom: 10 }} />

            <Text>Program:</Text>
            <TextInput value={program} onChangeText={setProgram} style={{ borderBottomWidth: 1, marginBottom: 10 }} />

            
            <Button title="Salvează" onPress={makePartener} />
        </ScrollView>
    );
};

export default NewPartener;
