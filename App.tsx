import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, TouchableHighlight, Dimensions, Image } from 'react-native';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as WebBrowser from 'expo-web-browser';
import * as MediaLibrary from 'expo-media-library';
import { Entypo, MaterialIcons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
import ViewShot from 'react-native-view-shot';
import { CameraType } from 'expo-camera/build/Camera.types';
import * as ImageManipulator from 'expo-image-manipulator';

let barcodeLinkTimeout: any = null;

export default function App() {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
    const [camType, setCamType] = useState<'back' | 'front'>('back');
    const [camera, setCamera] = useState<Camera | null>(null);
    const [cameraViewShot, setCameraViewShot] = useState<ViewShot | null>(null);
    const [cameraData, setCameraData] = useState<any>(null);
    const [barcodeLink, setBarcodeLink] = useState<string>('');
    const [lastImage, setLastImage] = useState<string>('');
    const [isRecording, setIsRecording] = useState<boolean>(false);

    useEffect(() => {
        Camera.requestPermissionsAsync()
            .then(({ status }) => {
                if (status === 'granted') return;
                else throw new Error('Camera Permission Denied');
            })
            .then(() => {
                return MediaLibrary.requestPermissionsAsync();
            })
            .then(({ status }) => {
                if (status === 'granted') setHasPermission(true);
                else throw new Error('Media Library Permission Denied');
            })
            .catch(e => {
                console.warn(e);
                setHasPermission(false);
            })
    }, [])

    const onCameraReady = async () => {

        if (camera === null || cameraData !== null) { return null; }
        const ratios = await camera.getSupportedRatiosAsync();
        //console.log(ratios);

        const sizes = await camera.getAvailablePictureSizesAsync('4:3');
        //console.log(sizes);

        setCameraData({ ratios, sizes })
    }

    if (hasPermission === null) {
        return <View></View>
    }
    if (hasPermission === false) {
        return <View><Text>No access to camera or media library. Check permission settings.</Text></View>
    }

    const flipImage = (uri: string) => {
        return ImageManipulator.manipulateAsync(uri, [{
            flip: ImageManipulator.FlipType.Horizontal
        }])
            .then(({ uri }) => uri);
    }

    const handleTakePhoto = () => {
        if (isRecording) {
            if (cameraViewShot) {
                let cap = cameraViewShot.capture;
                if (cap) {
                    cap().then(uri => {
                        if (camType === CameraType.front) {
                            return flipImage(uri);
                        }
                        else return uri;
                    })
                        .then(uri => {
                            return MediaLibrary.createAssetAsync(uri);
                        })
                        .then(({ uri }) => {
                            setLastImage(uri);
                        })
                }
            }
        }
        else {
            camera?.takePictureAsync()
                .then((data) => {
                    console.log(data.uri);
                    return MediaLibrary.createAssetAsync(data.uri);
                })
                .then((data) => {
                    setLastImage(data.uri);
                })
                .catch(e => {
                    console.warn(e);
                })
        }
    }

    const handleRecordVideo = async () => {
        if (!audioPermission) {
            Audio.requestPermissionsAsync()
                .then(({ status }) => {
                    if (status === 'granted') setAudioPermission(true)
                    else throw new Error('Audio permisson denied');
                })
                .catch(e => {
                    console.warn(e);
                    return;
                })
        }

        camera?.recordAsync()
            .then(({ uri }) => {
                return MediaLibrary.createAssetAsync(uri);
            })
            .then(({ uri }) => {
                return VideoThumbnails.getThumbnailAsync(uri);
            })
            .then(({ uri }) => {
                setLastImage(uri);
            })
        setIsRecording(true);
    }

    const handleStopRecording = () => {
        camera?.stopRecording();
        setIsRecording(false);
    }

    const handleFlip = () => {
        setCamType(currentType => {
            if (currentType === 'back') return 'front';
            else return 'back';
        })

        if (isRecording) setIsRecording(false);
    }

    const handleBarcodeScanned = (data: string) => {
        if (barcodeLinkTimeout) clearTimeout(barcodeLinkTimeout);
        setBarcodeLink(data);

        barcodeLinkTimeout = setTimeout(() => {
            setBarcodeLink('');
        }, 1000)
    }

    return (
        <SafeAreaView style={styles.container}>
            <SafeAreaView style={styles.container}>
                <ViewShot ref={(ref) => setCameraViewShot(ref)} options={{ format: "jpg", quality: 0.9 }} style={styles.camera}>
                    <Camera
                        style={{ width: '100%', height: '100%' }}
                        type={camType}
                        ref={(ref) => setCamera(ref)}
                        onCameraReady={() => onCameraReady()}
                        barCodeScannerSettings={{ barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr] }}
                        onBarCodeScanned={({ data }) => handleBarcodeScanned(data)}>
                    </Camera>
                </ViewShot>
            </SafeAreaView>
            <SafeAreaView style={styles.cameraUI}>
                <View style={{ width: '100%', alignContent: 'center' }}>
                    <TouchableHighlight
                        style={barcodeLink ? styles.barcodeLinkContainer : { display: 'none', width: 0 }}
                        onPress={() => WebBrowser.openBrowserAsync(barcodeLink)}
                        underlayColor={'#f0f7ff'}>
                        <Text style={styles.barcodeLink}>{barcodeLink}</Text>
                    </TouchableHighlight>
                </View>
                <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                        {isRecording ? (
                            <TouchableHighlight onPress={handleStopRecording} style={{ ...styles.photoButton, ...styles.record, backgroundColor: '#d0d0d0', }}>
                                <Entypo name="controller-stop" size={Dimensions.get('window').width * .1} color="red" />
                            </TouchableHighlight>
                        ) : (
                            <TouchableHighlight onPress={handleRecordVideo} style={{ ...styles.photoButton, ...styles.record, backgroundColor: 'red', }}>
                                <View style={styles.recordIcon}></View>
                            </TouchableHighlight>
                        )}


                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ width: '30%', alignItems: 'center' }}>
                            <TouchableHighlight style={{ width: Dimensions.get('window').width * .15, height: Dimensions.get('window').width * .15 }}>
                                {lastImage ? <Image source={{ uri: lastImage }} style={styles.mediaPreview} /> : <View style={styles.mediaPreview}></View>}
                            </TouchableHighlight>
                        </View>
                        <View style={{ width: '30%', alignItems: 'center' }}>
                            <TouchableHighlight onPress={handleTakePhoto} style={styles.photoButton}>
                                <Entypo name="camera" size={Dimensions.get('window').width * .15} color="black" style={styles.icon} />
                            </TouchableHighlight>
                        </View>
                        <View style={{ width: '30%', alignItems: 'center' }}>
                            <TouchableHighlight onPress={handleFlip} style={{ ...styles.photoButton, backgroundColor: 'black', borderColor: '#303030' }}>
                                <MaterialIcons name="flip-camera-android" size={Dimensions.get('window').width * .1} color="white" style={styles.icon} />
                            </TouchableHighlight>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    camera: {
        position: 'absolute',
        width: Dimensions.get('window').height * .75,
        height: Dimensions.get('window').height,
        alignItems: 'center'
    },
    cameraUI: {
        position: 'absolute',
        width: Dimensions.get('window').width,
        height: '100%',
        justifyContent: 'space-between',
        alignContent: 'center',
        padding: Dimensions.get('window').width * .03
    },
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
    },
    photoButton: {
        backgroundColor: '#c0c0c0',
        borderColor: '#f0f0f0',
        borderWidth: 2,
        borderRadius: 100,
        justifyContent: 'center',
        alignContent: 'center',
        height: 'auto'
    },
    icon: {
        padding: 10
    },
    recordIcon: {
        width: Dimensions.get('window').width * .1,
        height: Dimensions.get('window').width * .1
    },
    record: {
        borderWidth: 3,
        borderColor: '#c0c0c0'
    },
    mediaPreview: {
        width: '100%',
        height: '100%',
        backgroundColor: 'black'
    }
});