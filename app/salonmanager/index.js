import React, { useState, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import { useCallback } from 'react';
import { ActivityIndicator } from 'react-native-web';
import { TextInput } from 'react-native';
import { Button } from 'react-native';
const SalonManager = () => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [partener, setPartener] = useState(null);
  const [images, setImages] = useState([]);
  const [numePartener, setNumePartener] = useState(null);
  const [firma, setFirma] = useState(null);
  const [telefon, setTelefon] = useState(null);
  const [email, setEmail] = useState(null);
  const [adresa, setAdresa] = useState(null);
  const [cui,setCui] =useState(null);
  const handleSave = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://89.37.212.9:3000/partenerUpdate', {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
              'Token': `${token}`
          },
          body: JSON.stringify({ numePartener, firma, telefon, email, adresa, cui })
      });

      const result = await response.json();
      if (response.ok) {
          Alert.alert('Succes', 'Datele au fost actualizate');
          
      } else {
          Alert.alert('Eroare', result.error );
      }
  } catch (error) {
      Alert.alert('Eroare', 'Problema la conectarea cu serverul');
  }
};
  const getToken = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        throw new Error('Token not found in storage');
      }
      setToken(userToken);
    } catch (error) {
      console.error('Token retrieval error:', error);
      Alert.alert('Eroare', 'Nu am putut prelua tokenul de autentificare');
    }
  };
  const getSalonInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Eroare', 'Token lipsă!');
        return;
      }

      const response = await fetch('http://89.37.212.9:3000/user', {
        headers: { token }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nu s-au putut prelua datele');
      }

      if (data.partener) {
        setPartener(data.partener.partenerID);
        setNumePartener(data.partener.denumire);
        setEmail(data.partener.email);
        setAdresa(data.partener.adresa);
        setTelefon(data.partener.telefon);
        setFirma(data.partener.firma);
        setCui(partener);
      } else {
        setPartener('');
        setNumePartener('');
      }

    } catch (error) {
      console.error("Eroare:", error);
      Alert.alert('Eroare', error.message || 'Problema la conectarea cu serverul');
    }
  };
  const fetchImages = async () => {
    try {
      const response = await fetch(`http://89.37.212.9:3000/${partener}/list/images`);
      const data = await response.json();

      if (data.success) {
        setImages(data.images);
      }
    } catch (error) {
      console.log('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };
  const [reload, setReload] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const fetchAllData = async () => {
        setLoading(true);
        await getToken();
        await getSalonInfo();
        await fetchImages();
        setLoading(false);
      };

      fetchAllData();

    }, [loading])
  );
  const requestMediaPermissions = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted' || status === 'limited';
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const uploadLogoToServer = async (uri) => {
    if (!token) {
      throw new Error('Autentificare necesară - token lipsă');
    }

    try {
      // Get file info and validate
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Fișierul nu există');
      }

      // Prepare form data
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const fileExtension = filename.split('.').pop();
      const mimeType = `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`;

      // For Android, we need to read the file as blob
      let file;
      if (Platform.OS === 'android') {
        const fileContent = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        file = {
          uri: `data:${mimeType};base64,${fileContent}`,
          name: `logo.${fileExtension}`,
          type: mimeType,
        };
      } else {
        file = {
          uri,
          name: `logo.${fileExtension}`,
          type: mimeType,
        };
      }

      formData.append('logo', file);

      // Upload to server
      const response = await fetch('http://89.37.212.9:3000/salonlogochange', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
          'token': token,
        },
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Server response error:', responseData);
        throw new Error(responseData.message || `Eroare server.. (status ${response.status})`);
      }

      return responseData;
    } catch (error) {
      console.error('Upload error details:', {
        error: error.message,
        stack: error.stack,
        uri,
        token: token ? 'exists' : 'missing',
      });
      throw error;
    }
  };

  const handleLogoSelection = async () => {
    if (loading) return;

    try {
      setLoading(true);

      // Check permissions
      const hasPermission = await requestMediaPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permisiuni necesare',
          'Aplicația are nevoie de acces la galerie pentru a încărca imagini.',
          [
            { text: 'Închide', style: 'cancel' },
            { text: 'Setări', onPress: ImagePicker.openSettings },
          ]
        );
        return;
      }

      // Select image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: Platform.OS === 'android', // Needed for Android file handling
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      // Upload image
      const selectedImage = result.assets[0];
      const response = await uploadLogoToServer(selectedImage.uri);

      Alert.alert('Succes', response.message || 'Logo actualizat cu succes!');
    } catch (error) {
      console.error('Full error:', error);
      Alert.alert(
        'Eroare la încărcare',
        error.message || 'A apărut o problemă la încărcarea imaginii. Vă rugăm încercați din nou.'
      );
    } finally {
      setLoading(false);
      setReload(!reload);
    }
  };
  const uploadImageToServer = async (uri) => {
    if (!token) {
      throw new Error('Autentificare necesară - token lipsă');
    }

    try {
      // Get file info and validate
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Fișierul nu există');
      }

      // Prepare form data
      const formData = new FormData();
      const filename = uri.split('/').pop();
      const fileExtension = filename.split('.').pop();
      const mimeType = `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`;

      // For Android, we need to read the file as blob
      const file = {
        uri,
        name: `item.${fileExtension}`, // sau `logo`
        type: mimeType,
      };

      formData.append('photo', file);

      // Upload to server
      const response = await fetch('http://89.37.212.9:3000/newsalonphoto', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
          'token': token,
        },
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Server response error:', responseData);
        throw new Error(responseData.message || `Eroare server.. (status ${response.status})`);
      }

      return responseData;
    } catch (error) {
      console.error('Upload error details:', {
        error: error.message,
        stack: error.stack,
        uri,
        token: token ? 'exists' : 'missing',
      });
      throw error;
    }
  };

  const handleImageSelection = async () => {
    if (loading) return;
    setLoading(true);

    try {
      setLoading(true);

      // Check permissions
      const hasPermission = await requestMediaPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permisiuni necesare',
          'Aplicația are nevoie de acces la galerie pentru a încărca imagini.',
          [
            { text: 'Închide', style: 'cancel' },
            { text: 'Setări', onPress: ImagePicker.openSettings },
          ]
        );
        return;
      }

      // Select image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.8,
        base64: Platform.OS === 'android', // Needed for Android file handling
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      // Upload image
      const selectedImage = result.assets[0];
      const response = await uploadImageToServer(selectedImage.uri);

      Alert.alert('Succes', response.message || 'Imagine incarcata cu succes!');
    } catch (error) {
      console.error('Full error:', error);
      Alert.alert(
        'Eroare la încărcare',
        error.message || 'A apărut o problemă la încărcarea imaginii. Vă rugăm încercați din nou.'
      );
    } finally {
      await new Promise(resolve => setTimeout(resolve, 1000));

      setLoading(false);
    }
  };

  const deleteImage = async (imageNumber) => {
    try {
      const response = await fetch(`http://89.37.212.9:3000/${partener}/images/${imageNumber}`, {
        method: 'DELETE',
        headers: {
          'token': token,
        }
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Succes', 'Imaginea a fost ștearsă');
        // Refresh the images list
        fetchImages();
      } else {
        Alert.alert('Eroare', result.message || 'Eroare la ștergere');
      }
    } catch (error) {
      Alert.alert('Eroare', 'A apărut o problemă');
      console.error('Delete error:', error);
    }
  };

  const handleLongPress = (imageNumber) => {
    Alert.alert(
      'Șterge imagine',
      'Sigur doriți să ștergeți această imagine?',
      [
        {
          text: 'Anulează',
          style: 'cancel',
        },
        {
          text: 'Șterge',
          onPress: () => deleteImage(imageNumber),
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };
  if (!token) {
    return (
      <View style={styles.container}>
        <Text>Se încarcă...</Text>
      </View>
    );
  }

  if (!loading)
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.sectionTitle}>Nume salon:</Text>
        <TextInput value={numePartener} onChangeText={setNumePartener} style={{ borderBottomWidth: 1, marginBottom: 10, textAlign: 'center' }} />
        <Text style={styles.sectionTitle}>Logo</Text>
        <View style={styles.logoContainer}>
          <TouchableOpacity
            style={[styles.logoButton, loading && styles.disabledButton]}
            onPress={handleLogoSelection}
            disabled={loading}
          >
            <Image
              source={{ uri: `http://89.37.212.9:3000/${partener}/logo?timestamp=${new Date().getTime()}` }}
              style={{
                width: 200,
                height: 200,
                resizeMode: 'contain',
              }}
            />
            <Text style={styles.logoButtonText}>
              {loading ? 'Se încarcă...' : '+'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Imagini de prezentare</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryContainer}>
          {images.map((imageName) => {

            const imageNumber = imageName.split('.')[0];
            return (
              <TouchableOpacity
                key={imageName}
                style={styles.logoButton}
                onLongPress={() => handleLongPress(imageNumber)}
                delayLongPress={200}
              >
                <Image
                  source={{ uri: `http://89.37.212.9:3000/${partener}/${imageNumber}?timestamp=${new Date().getTime()}` }}
                  style={{ width: 200, height: 200 }}
                  resizeMode='contain'
                />
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={handleImageSelection} style={styles.logoButton}>
            <Text style={styles.logoButtonText}>+</Text>
          </TouchableOpacity>
        </ScrollView>
        <Text style={styles.sectionTitle}>Contact:</Text>
        <View style={{ padding: 20 }}>
          <Text>Denumire Firma:</Text>
          <TextInput value={firma} onChangeText={setFirma} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
          <Text>CUI:</Text>
          <TextInput value={cui} onChangeText={setCui} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
          <Text>Adresa:</Text>
          <TextInput value={adresa} onChangeText={setAdresa} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
          <Text>Email:</Text>
          <TextInput value={email} onChangeText={setEmail} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
          <Text>Telefon:</Text>
          <TextInput value={telefon} onChangeText={setTelefon} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
          <Button onPress={handleSave} title='Salveaza informatiile'></Button>
        </View>
        
      </ScrollView>

    );
};
const styles = StyleSheet.create({

  container: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom:50
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  galleryContainer: {
    marginTop: 10,
    marginVertical: 15
  },
  logoButton: {
    overflow: 'hidden',
    width: 200,
    height: 200,
    backgroundColor: 'rgba(161, 161, 161, 0.4)',
    alignItems: 'center',
    borderRadius: 10,
    marginRight: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  logoButtonText: {
    fontSize: 48,
    fontWeight: '200',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
});

export default SalonManager;