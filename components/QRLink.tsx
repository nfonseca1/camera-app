import React from 'react';
import { StyleSheet, Text, TouchableHighlight } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

interface Props {
    link: string
}

export default function (props: Props) {
    return (
        <TouchableHighlight
            style={props.link ? styles.barcodeLinkContainer : { display: 'none', width: 0 }}
            onPress={() => WebBrowser.openBrowserAsync(props.link)}
            underlayColor={'#f0f7ff'}>
            <Text style={styles.barcodeLink}>{props.link}</Text>
        </TouchableHighlight>
    )
}

const styles = StyleSheet.create({
    barcodeLinkContainer: {
        position: 'absolute',
        marginTop: '5%',
        left: '15%',
        width: '70%',
        backgroundColor: 'rgba(255,255,255,.8)',
        borderRadius: 10,
        justifyContent: 'center'
    },
    barcodeLink: {
        textAlign: 'center',
        color: '#1962b5',
        padding: 5
    }
});