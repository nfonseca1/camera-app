import React from 'react';
import { Dimensions } from 'react-native';
import { FlashMode } from 'expo-camera/build/Camera.types';
import { MaterialIcons } from '@expo/vector-icons';


type FlashSetting = {
    mode: FlashMode,
    icon: JSX.Element
}

interface Flash {
    off: FlashSetting,
    on: FlashSetting,
    auto: FlashSetting,
    torch: FlashSetting
}

enum PreviewStyle {
    'contain',
    'cover'
}

const FlashOptions: Flash = {
    auto: {
        mode: FlashMode.auto,
        icon: <MaterialIcons name="flash-auto" size={Dimensions.get('window').width * .06} color="#ffd469" style={{ padding: 7 }} />
    },
    on: {
        mode: FlashMode.on,
        icon: <MaterialIcons name="flash-on" size={Dimensions.get('window').width * .06} color="#ffd469" style={{ padding: 7 }} />
    },
    off: {
        mode: FlashMode.off,
        icon: <MaterialIcons name="flash-off" size={Dimensions.get('window').width * .06} color="white" style={{ padding: 7 }} />
    },
    torch: {
        mode: FlashMode.torch,
        icon: <MaterialIcons name="flash-on" size={Dimensions.get('window').width * .06} color="#ffd469" style={{ padding: 7 }} />
    }
}

interface Permissions {
    camera: boolean | null,
    audio: boolean | null,
    mediaLibrary: boolean | null,
    brightness: boolean | null
}

export { PreviewStyle, FlashOptions, FlashSetting, Permissions }