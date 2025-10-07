import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';

const HomePage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useFocusEffect(() => {
        // Poți adăuga aici alte efecte dorite
    });

    useEffect(() => {
        if (searchQuery.length > 2) { // Se face căutare doar dacă sunt introduse minim 3 caractere
            setLoading(true);
            fetch(`https://exemplu.com/api/search?q=${searchQuery}`)
                .then(response => response.json())
                .then(data => {
                    setResults(data.results);
                    setLoading(false);
                })
                .catch(error => {
                    console.error('Eroare la căutare:', error);
                    setLoading(false);
                });
        } else {
            setResults([]);
        }
    }, [searchQuery]);

    return (
        <View style={{ padding: 20 }}>
            <TextInput
                placeholder="Caută..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ borderWidth: 1, padding: 10, borderRadius: 5, marginBottom: 10 }}
            />
            {loading && <ActivityIndicator size="large" color="#0000ff" />}
            <FlatList
                data={results}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => <Text style={{ padding: 10 }}>{item.name}</Text>}
            />
        </View>
    );
};

export default HomePage;
