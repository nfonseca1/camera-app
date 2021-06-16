import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableHighlight, Dimensions, Image, Platform, Alert } from 'react-native';
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
import GestureRecognizer from 'react-native-swipe-gestures';

import QRLink from './components/QRLink';

import permissions from './lib/permissions';
import { PreviewStyle, FlashOptions, FlashSetting, Permissions } from './lib/types';
import { ViewStyle } from 'react-native';

let barcodeLinkTimeout: any = null;
let viewMessageTimeout: any = null;
let cameraViewShot: ViewShot | null = null;
let camera: Camera | null = null;

interface State {
    permissions: Permissions
    cameraType: CameraType,
    aspectRatios: string[],
    activeRatio: number | null,
    viewMessage: string,
    barcodeLink: string,
    recentImageThumbnail: string,
    isRecording: boolean,
    previewStyle: PreviewStyle,
    flashSetting: FlashSetting
}

export default class App extends React.Component<{}, State> {

    constructor(props: {}) {
        super(props);

        this.state = {
            permissions: { camera: null, audio: null, mediaLibrary: null, brightness: null },
            cameraType: CameraType.back,
            aspectRatios: [],
            activeRatio: null,
            viewMessage: '',
            barcodeLink: '',
            recentImageThumbnail: '',
            isRecording: false,
            previewStyle: PreviewStyle.cover,
            flashSetting: FlashOptions.off
        }

        this.onCameraReady = this.onCameraReady.bind(this);
        this.flipImage = this.flipImage.bind(this);
        this.capturePreview = this.capturePreview.bind(this);
        this.handleTakePhoto = this.handleTakePhoto.bind(this);
        this.recordvideo = this.recordvideo.bind(this);
        this.handleRecordVideo = this.handleRecordVideo.bind(this);
        this.stopRecording = this.stopRecording.bind(this);
        this.handleFlip = this.handleFlip.bind(this);
        this.handleBarcodeScanned = this.handleBarcodeScanned.bind(this);
        this.handleFlashToggle = this.handleFlashToggle.bind(this);
        this.handleTorchToggle = this.handleTorchToggle.bind(this);
        this.togglePreviewStyle = this.togglePreviewStyle.bind(this);
        this.openPhotos = this.openPhotos.bind(this);
        this.toggleRatio = this.toggleRatio.bind(this);
    }

    componentDidMount() {
        permissions.camera()
            .then((allowed) => {
                this.setState(currentState => ({ permissions: { ...currentState.permissions, camera: allowed } }));
                if (allowed) {
                    return permissions.mediaLibrary()
                }
                else {
                    throw new Error('Access Denied');
                }
            })
            .then((allowed) => {
                this.setState(currentState => ({ permissions: { ...currentState.permissions, mediaLibrary: allowed } }));
            })
            .catch(e => {
                console.log(e.message);
            })
    }

    async onCameraReady() {
        let activeRatio = this.state.activeRatio;

        if (camera !== null && activeRatio === null) {
            const ratios = await camera.getSupportedRatiosAsync();
            let idx = ratios.indexOf('4:3');
            this.setState({ aspectRatios: ratios, activeRatio: idx === -1 ? 0 : idx });
        }
    }

    flipImage(uri: string) {
        return ImageManipulator.manipulateAsync(uri, [{
            flip: ImageManipulator.FlipType.Horizontal
        }])
            .then(({ uri }) => uri);
    }

    capturePreview() {
        if (!cameraViewShot) return;

        let cap = cameraViewShot.capture;
        if (cap) {
            cap().then(uri => {
                if (this.state.cameraType === CameraType.front) {
                    return this.flipImage(uri);
                }
                else return uri;
            })
                .then(uri => {
                    return MediaLibrary.createAssetAsync(uri);
                })
                .then(({ uri }) => {
                    this.setState({ recentImageThumbnail: uri });
                })
        }
    }

    handleTakePhoto() {
        let _s = this.state;
        if (!camera) return;

        if (_s.isRecording) {
            if (!(_s.cameraType === CameraType.front && _s.flashSetting.mode === FlashMode.torch)) {
                this.capturePreview();
            }
            return;
        }
        if (_s.flashSetting.mode === FlashMode.torch && _s.cameraType === CameraType.back) {
            this.capturePreview();
        }

        let frontFlash = (_s.cameraType === CameraType.front && _s.flashSetting.mode === FlashMode.on) ? true : false;
        if (frontFlash) this.setState({ flashSetting: FlashOptions.torch })

        // Take photo
        camera?.takePictureAsync()
            .then((data) => {
                if (frontFlash) this.setState({ flashSetting: FlashOptions.on });
                return MediaLibrary.createAssetAsync(data.uri);
            })
            .then((data) => {
                this.setState({ recentImageThumbnail: data.uri });
            })
            .catch(e => {
                console.warn(e);
            })
    }

    recordvideo() {
        let _s = this.state;
        if (!camera) return;

        camera?.recordAsync()
            .then(({ uri }) => {
                return MediaLibrary.createAssetAsync(uri);
            })
            .then(({ uri }) => {
                return VideoThumbnails.getThumbnailAsync(uri);
            })
            .then(({ uri }) => {
                this.setState({ recentImageThumbnail: uri })
            })
        this.setState({ isRecording: true })

        if (_s.flashSetting.mode === FlashMode.on) this.setState({ flashSetting: FlashOptions.torch });
    }

    handleRecordVideo() {
        let _s = this.state;

        if (_s.permissions.audio === null) {
            permissions.audio()
                .then(allowed => {
                    this.setState(currentState => ({ permissions: { ...currentState.permissions, audio: allowed } }));
                    if (allowed) this.recordvideo();
                })
        }
        else if (_s.permissions.audio === false) {
            Alert.alert(
                'Microphone Access Denied',
                'Cannot record video without microphone permission. Check permission settings to allow.'
            )
        }
        else {
            this.recordvideo();
        }
    }

    stopRecording() {
        if (!camera) return;

        camera.stopRecording();
        this.setState({ isRecording: false })
    }

    handleFlip() {
        let _s = this.state;

        if (_s.cameraType === CameraType.back) {
            this.setState({
                cameraType: CameraType.front,
                flashSetting: FlashOptions.off
            })
        }
        else {
            Brightness.useSystemBrightnessAsync();
            this.setState({
                cameraType: CameraType.back,
                flashSetting: FlashOptions.off
            })
        }

        if (_s.isRecording) this.setState({ isRecording: false })
    }

    handleBarcodeScanned(data: string) {
        if (barcodeLinkTimeout) clearTimeout(barcodeLinkTimeout);
        this.setState({ barcodeLink: data })

        barcodeLinkTimeout = setTimeout(() => {
            this.setState({ barcodeLink: '' })
        }, 1000)
    }

    handleFlashToggle() {
        let _s = this.state;

        // For back camera, switch to next flash setting
        if (_s.cameraType === CameraType.back) {
            this.setState(currentState => {
                let f = currentState.flashSetting;
                if (f.mode === FlashMode.off) return { flashSetting: FlashOptions.auto };
                if (f.mode === FlashMode.auto) return { flashSetting: FlashOptions.on };
                if (f.mode === FlashMode.on) return { flashSetting: FlashOptions.off };
                return { flashSetting: FlashOptions.off };
            })
        }
        // For front camera, toggle (between on and off)
        else if (_s.flashSetting.mode === FlashMode.off) {

            const toggle = () => {

                this.setState({ flashSetting: FlashOptions.on })
            }

            if (_s.permissions.brightness === null) {
                permissions.brightness()
                    .then(allowed => {
                        this.setState(currentState => ({ permissions: { ...currentState.permissions, brightness: allowed } }));
                        if (allowed) toggle();
                    })
            }
            else if (_s.permissions.brightness === false) {
                Alert.alert(
                    'Brightness Access Denied',
                    'Cannot use front flash without brightness permission. Check permission settings to allow.'
                )
            }
            else {
                toggle();
            }

        }
        else {
            this.setState({ flashSetting: FlashOptions.off })
        }
    }

    handleTorchToggle() {
        this.setState(currentState => {
            let f = currentState.flashSetting;
            if (f.mode === FlashMode.torch) return { flashSetting: FlashOptions.on };
            else return { flashSetting: FlashOptions.torch };
        })
    }

    togglePreviewStyle() {
        if (this.state.isRecording) return;
        this.setState(currentState => {
            let style = currentState.previewStyle;
            return style === PreviewStyle.contain ? { previewStyle: PreviewStyle.cover } : { previewStyle: PreviewStyle.contain }
        });
    }

    openPhotos() {
        switch (Platform.OS) {
            case "ios":
                Linking.openURL("photos-redirect://");
                break;
            case "android":
                Linking.openURL("content://media/internal/images/media");
                break;
            default:
                console.warn("Could not open gallery app");
        }
    }

    toggleRatio(increment: 1 | -1 = 1) {
        let _s = this.state;

        if (_s.activeRatio != null) {
            let next = _s.activeRatio + increment;
            let idx = 0;
            if (next < _s.aspectRatios.length) idx = next;
            if (next < 0) idx = _s.aspectRatios.length - 1;
            this.setState({ activeRatio: idx, viewMessage: _s.aspectRatios[idx] });

            if (viewMessageTimeout) clearTimeout(viewMessageTimeout);
            viewMessageTimeout = setTimeout(() => this.setState({ viewMessage: '' }), 1000)
        }
    }

    render() {
        let _s = this.state;

        let frontFlashOn = _s.flashSetting.mode === FlashMode.torch && _s.cameraType === CameraType.front;

        let ratioProp = _s.activeRatio != null ? { ratio: _s.aspectRatios[_s.activeRatio] } : null;
        let camStyles = {
            cameraCover: {
                width: Dimensions.get('window').height * .75,
                height: Dimensions.get('window').height,
            },
            cameraContain: {
                width: Dimensions.get('window').width,
                height: Dimensions.get('window').width * 1.333,
            }
        }

        if (ratioProp?.ratio != null) {
            let wh = ratioProp.ratio.split(':');
            let w = parseInt(wh[0]);
            let h = parseInt(wh[1]);
            camStyles.cameraCover.width = Dimensions.get('window').height * (h / w);
            camStyles.cameraCover.height = Dimensions.get('window').height;
            camStyles.cameraContain.width = Dimensions.get('window').width;
            camStyles.cameraContain.height = Dimensions.get('window').width * (w / h);
        }

        let containerStyle: ViewStyle = camStyles.cameraContain.height >= Dimensions.get('window').height * .7
            ? { justifyContent: 'center' } : {}
        let viewShotStyle = _s.previewStyle === PreviewStyle.contain
            ? { ...styles.camera, ...camStyles.cameraContain, marginTop: Dimensions.get('window').height * .12 }
            : { ...styles.camera, ...camStyles.cameraCover }
        let frontFlashStyle: ViewStyle = {
            width: '100%', height: '100%', justifyContent: 'center', backgroundColor: frontFlashOn
                ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0)'
        }

        if (_s.permissions.camera === false || _s.permissions.mediaLibrary === false) {
            return (
                <SafeAreaView style={{ width: '100%', height: '100%', backgroundColor: 'black', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', textAlign: 'center' }}>Permission denied, camera cannot be accessed. Check permission settings to allow.</Text>
                </SafeAreaView>
            )
        }
        else if (_s.permissions.camera === null || _s.permissions.mediaLibrary === null) {
            return (
                <SafeAreaView style={{ width: '100%', height: '100%', backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
                    <Entypo name="camera" size={Dimensions.get('window').width * .15} color="white" />
                </SafeAreaView>
            )
        }

        if (_s.cameraType === CameraType.front) {
            if (_s.flashSetting.mode === FlashMode.torch) Brightness.setBrightnessAsync(1);
            else if (_s.flashSetting.mode === FlashMode.on) Brightness.useSystemBrightnessAsync();
        }

        return (
            <GestureRecognizer config={{ velocityThreshold: 0.05 }}
                onSwipeRight={() => this.toggleRatio(1)}
                onSwipeLeft={() => this.toggleRatio(-1)}
                style={{ width: '100%', height: '100%' }}>
                <SafeAreaView style={{ ...styles.container, backgroundColor: frontFlashOn ? 'white' : 'black' }}>
                    <SafeAreaView style={{ ...styles.container, ...containerStyle }}>
                        <ViewShot ref={(ref) => cameraViewShot = ref}
                            options={{ format: "jpg", quality: 1 }}
                            style={viewShotStyle}>

                            <Camera
                                style={{ width: '100%', height: '100%' }}
                                type={_s.cameraType}
                                flashMode={_s.flashSetting.mode}
                                ref={(ref) => camera = ref}
                                onCameraReady={() => this.onCameraReady()}
                                barCodeScannerSettings={{ barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr] }}
                                onBarCodeScanned={({ data }) => this.handleBarcodeScanned(data)}
                                {...ratioProp}>

                                <View
                                    style={frontFlashStyle}>
                                    <Text
                                        style={{ ...styles.viewMessage, backgroundColor: _s.viewMessage ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0)' }}>
                                        {_s.viewMessage}
                                    </Text>
                                </View>
                            </Camera>
                        </ViewShot>
                    </SafeAreaView>
                    <SafeAreaView style={styles.cameraUI}>
                        <View style={{ justifyContent: 'space-between', flexDirection: 'row', flex: 1, paddingVertical: 10 }}>
                            <QRLink link={_s.barcodeLink} />
                            <View style={{ height: '100%', justifyContent: 'flex-start', alignItems: 'center' }}>
                                <TouchableHighlight style={{ ...styles.switchButton, opacity: _s.isRecording ? 0 : 1 }} onPress={this.togglePreviewStyle}>
                                    <MaterialIcons name="preview" size={Dimensions.get('window').width * .06} color="black" style={styles.icon} />
                                </TouchableHighlight>
                            </View>
                            <View style={{ flex: 1, flexDirection: 'row', alignContent: 'center', justifyContent: 'space-between' }}>

                            </View>
                            <View style={{ height: '100%', justifyContent: 'flex-start', alignItems: 'center' }}>
                                <TouchableHighlight style={styles.flashContainer} onPress={this.handleFlashToggle}>
                                    {_s.flashSetting.icon}
                                </TouchableHighlight>
                                {_s.flashSetting.mode === FlashMode.on || _s.flashSetting.mode === FlashMode.torch ? (
                                    <TouchableHighlight
                                        style={{ ...styles.torchButton, backgroundColor: _s.flashSetting.mode === FlashMode.torch ? '#ffd469' : '#d0d0d0' }}
                                        onPress={this.handleTorchToggle}
                                        hitSlop={{ bottom: 8, top: 8, left: 8, right: 8 }}><Text></Text>
                                    </TouchableHighlight>
                                ) : (
                                    <View />
                                )}
                            </View>
                        </View>
                        <View style={{ width: '100%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 }}>
                                {_s.isRecording ? (
                                    <TouchableHighlight onPress={this.stopRecording} style={{ ...styles.photoButton, ...styles.record, backgroundColor: '#d0d0d0', }}>
                                        <Entypo name="controller-stop" size={Dimensions.get('window').width * .1} color="red" />
                                    </TouchableHighlight>
                                ) : (
                                    <TouchableHighlight onPress={this.handleRecordVideo} style={{ ...styles.photoButton, ...styles.record, backgroundColor: 'red', }}>
                                        <View style={styles.recordIcon}></View>
                                    </TouchableHighlight>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ width: '30%', alignItems: 'center' }}>
                                    <TouchableHighlight style={{ width: Dimensions.get('window').width * .15, height: Dimensions.get('window').width * .15 }}
                                        onPress={this.openPhotos}>
                                        {_s.recentImageThumbnail ? <Image source={{ uri: _s.recentImageThumbnail }} style={styles.mediaPreview} /> : <View style={styles.mediaPreview}></View>}
                                    </TouchableHighlight>
                                </View>
                                <View style={{ width: '30%', alignItems: 'center' }}>
                                    <TouchableHighlight onPress={this.handleTakePhoto} style={styles.photoButton}>
                                        <Entypo name="camera" size={Dimensions.get('window').width * .13} color="black" style={styles.icon} />
                                    </TouchableHighlight>
                                </View>
                                <View style={{ width: '30%', alignItems: 'center' }}>
                                    <TouchableHighlight onPress={this.handleFlip} style={{ ...styles.photoButton, backgroundColor: 'black', borderColor: '#303030' }}>
                                        <MaterialIcons name="flip-camera-android" size={Dimensions.get('window').width * .1} color="white" style={styles.icon} />
                                    </TouchableHighlight>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </SafeAreaView>
            </GestureRecognizer>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center'
    },
    camera: {
        position: 'absolute',
        alignItems: 'center'
    },
    cameraUI: {
        position: 'absolute',
        width: Dimensions.get('window').width,
        height: '100%',
        justifyContent: 'space-between',
        alignContent: 'center',
        paddingHorizontal: Dimensions.get('window').width * .03,
        paddingVertical: Dimensions.get('window').width * .01
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
        padding: 7
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
        backgroundColor: 'black',
        borderWidth: 2,
        borderColor: '#d0d0d0',
        borderRadius: 3
    },
    flashContainer: {
        backgroundColor: 'black',
        borderWidth: 2,
        borderColor: '#d0d0d0',
        borderRadius: 100
    },
    torchButton: {
        marginTop: 10,
        width: Dimensions.get('window').width * .05,
        height: Dimensions.get('window').width * .05,
        backgroundColor: '#d0d0d0',
        borderRadius: 100,
        borderWidth: 2,
        borderColor: '#d0d0d0'
    },
    switchButton: {
        backgroundColor: '#d0d0d0',
        borderRadius: 100,
        borderWidth: 2,
        borderColor: 'white'
    },
    viewMessage: {
        textAlign: 'center',
        color: 'white',
        fontSize: 35,
        fontWeight: 'bold',
        lineHeight: 40
    }
});