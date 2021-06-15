import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as MediaLibrary from 'expo-media-library';
import { Entypo, MaterialIcons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import ViewShot from 'react-native-view-shot';
import { CameraType, FlashMode } from 'expo-camera/build/Camera.types';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Linking from 'expo-linking';
import * as Brightness from 'expo-brightness';

interface MakeRequestOptions {
    requestAsyncFunc: () => Promise<{ status: string }>,
    alertTitle: string,
    alertMessage: string,
    errorMessage: string
}

async function makeRequest(options: MakeRequestOptions): Promise<void> {
    return new Promise((resolve, reject) => {
        const reqPermission = async () => {
            return options.requestAsyncFunc()
                .then(({ status }) => {
                    if (status === 'granted') return;
                    else throw new Error(options.errorMessage);
                })
        }
        Alert.alert(
            options.alertTitle,
            options.alertMessage,
            [{
                text: 'OK', onPress: () => {
                    reqPermission()
                        .then(() => resolve())
                        .catch(e => reject(e))
                }
            }]
        )
    })
}

const request = {
    camera: async () => {
        return makeRequest({
            requestAsyncFunc: Camera.requestPermissionsAsync,
            alertTitle: 'Access To Camera Required',
            alertMessage: "Select 'allow' in the next prompt to allow camera use.",
            errorMessage: 'Camera Permission Denied'
        })
            .catch(e => {
                throw new Error(e);
            })
    },
    audio: async () => {
        return makeRequest({
            requestAsyncFunc: Audio.requestPermissionsAsync,
            alertTitle: 'Access To Microphone Required',
            alertMessage: "Select 'allow' in the next prompt to allow audio use for video recording.",
            errorMessage: 'Audio Permission Denied'
        })
            .catch(e => {
                throw new Error(e);
            })
    },
    mediaLibrary: async () => {
        return makeRequest({
            requestAsyncFunc: MediaLibrary.requestPermissionsAsync,
            alertTitle: 'Access To Media Library Required',
            alertMessage: "Select 'allow' in the next prompt to allow photos to be saved.",
            errorMessage: 'Media Library Permission Denied'
        })
            .catch(e => {
                throw new Error(e);
            })
    },
    brightness: async () => {
        return makeRequest({
            requestAsyncFunc: Brightness.requestPermissionsAsync,
            alertTitle: 'Access To Device Brightness Required',
            alertMessage: "Select 'allow' in the next prompt to allow brightness access for front facing flash.",
            errorMessage: 'Brightness Permission Denied'
        })
            .catch(e => {
                throw new Error(e);
            })
    }
}


interface HandlePermissonOptions {
    getAsyncFunction: () => Promise<{ status: string }>,
    requestFunc: () => Promise<void>,
    deniedMessage: string
}

async function handlePermission(options: HandlePermissonOptions) {
    return options.getAsyncFunction()
        .then(({ status }) => {
            if (status === 'granted') return;
            else return options.requestFunc();
        })
        .then(() => {
            return true;
        })
        .catch(e => {
            Alert.alert(
                'Access Denied',
                options.deniedMessage
            )
            return false;
        })
}

export default {
    camera: async () => {
        return handlePermission({
            getAsyncFunction: Camera.getPermissionsAsync,
            requestFunc: request.camera,
            deniedMessage: 'Cannot use camera without permission. Go to permission settings to allow.'
        })
    },
    audio: async () => {
        return handlePermission({
            getAsyncFunction: Audio.getPermissionsAsync,
            requestFunc: request.audio,
            deniedMessage: 'Cannot record video without audio permission. Go to permission settings to allow.'
        })
    },
    mediaLibrary: async () => {
        return handlePermission({
            getAsyncFunction: MediaLibrary.getPermissionsAsync,
            requestFunc: request.mediaLibrary,
            deniedMessage: 'Cannot save photos and videos without permission. Go to permission settings to allow.'
        })
    },
    brightness: async () => {
        return handlePermission({
            getAsyncFunction: Brightness.getPermissionsAsync,
            requestFunc: request.brightness,
            deniedMessage: 'Cannot use front facing flash without permission. Go to permission settings to allow.'
        })
    }
}