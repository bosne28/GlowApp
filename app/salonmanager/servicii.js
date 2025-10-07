import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Dropdown } from 'react-native-element-dropdown';
import { Text } from 'react-native';
const departamente = [
    { label: 'dep1', value: '1' },
    { label: '  + Adaugă un departament', value: '0' },
];

const ServiciiManager = () => {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Dropdown
                data={departamente}
                labelField="label"  // Corectat de la 'lable' la 'label'
                valueField="value"
                placeholder="Selectează departament"
                onChange={(item) => {
                    if (item.value === '0') {
                        router.push('salonmanager/(modal)/adddepart');
                    }
                }}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.itemTextStyle}
                itemContainerStyle={styles.itemContainerStyle}
                style={styles.dropdown}
                containerStyle={styles.dropdownContainer}
                activeColor="#f0f0f0"
                renderItem={(item) => (
                    <View style={styles.item}>
                        <Text style={styles.textItem}>{item.label}</Text>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    dropdown: {
        height: 50,
        borderColor: 'gray',
        borderWidth: 0.5,
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    dropdownContainer: {
        backgroundColor: 'white',
        borderColor: 'gray',
        borderWidth: 0.5,
        borderRadius: 8,
        marginTop: 5,
    },
    placeholderStyle: {
        fontSize: 16,
        color: 'gray',
    },
    selectedTextStyle: {
        fontSize: 16,
        color: 'black',
    },
    itemTextStyle: {
        fontSize: 16,
        color: 'black',
    },
    itemContainerStyle: {
        height: 40,
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    item: {
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textItem: {
        fontSize: 16,
        color: 'black',
    },
});

export default ServiciiManager;