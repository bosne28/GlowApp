import React, { useEffect, useState } from 'react';
import { View, Text, BackHandler } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
const Loiality = () => {
    const router = useRouter();
    useFocusEffect(() => {

        });
    return (
        <>
            <View>
                <Text>Bine ai venit pe pagina principală!</Text>
            </View>
        </>
    );
};

export default Loiality;