import $ from 'jquery';
import * as dashjs from 'dashjs';
import videojs from 'video.js';
import 'videojs-contrib-dash'
import './dependencies/videojs-xr.es.js';
import MatrixMultiplier from './dependencies/MatrixMultiplier.js';
import { zoom, zoomfactors } from './dependencies/zoom.js';
import PlaybackEventHandler from './dependencies/PlaybackEventHandler.js';
import HOASTloader from './dependencies/HoastLoader.js';
import HOASTBinDecoder from './dependencies/HoastBinauralDecoder.js';
import HOASTRotator from './dependencies/HoastRotator.js';
import './css/video-js.css';

"use strict";

var order,
    chCounts,
    chStrings,
    numActiveAudioPlayers,
    irs,
    mediaUrl,
    audioElements = [],
    audioPlayers = [],
    sourceNodes = [],
    channelSplitters = [],
    audioSetupComplete = false,
    videoSetupComplete = false,
    context, channelMerger, rotator, multiplier, decoder,
    masterGain, numCh, videoPlayer, playbackEventHandler;

var maxOrder = 4;
var tracksPerAudioPlayer = 8;
var maxTracksPerAudioFile = 8;
var maxNrOfAudioPlayers = Math.ceil((maxOrder + 1) * (maxOrder + 1) / tracksPerAudioPlayer);

var AudioContext = window.AudioContext // Default
    || window.webkitAudioContext; // safari
context = new AudioContext;
console.log(context);

playbackEventHandler = new PlaybackEventHandler(context);

// create as many audio players as we need for max order
for (let i = 0; i < maxNrOfAudioPlayers; ++i) {
    audioElements[i] = new Audio();

    // create sourceNodes and connect to splitters as we cannot disconnect and reuse these
    // (error: HTMLMediaElement already connected ...)
    channelSplitters[i] = context.createChannelSplitter(maxTracksPerAudioFile);
    sourceNodes[i] = context.createMediaElementSource(audioElements[i]);
    sourceNodes[i].connect(channelSplitters[i]);
}

export function initialize(newMediaUrl, newOrder) {
    let playerhtml = "<video-js id='videojs-player' class='video-js vjs-big-play-centered' controls preload='auto' crossorigin='anonymous' data-setup='{}'></video-js>";
    $('#playerdiv').append(playerhtml);
    videoPlayer = videojs('videojs-player');
    videoPlayer.xr();
    console.log(videoPlayer);
    console.log(videoPlayer.xr());

    audioSetupComplete = false;
    videoSetupComplete = false;

    order = newOrder;
    mediaUrl = newMediaUrl;
    setOrderDependentVariables();
    console.log('numActiveAudioPlayer: ' + numActiveAudioPlayers);

    videoPlayer.src({ type: 'application/dash+xml', src: mediaUrl + '/video.mpd' });

    for (let i = 0; i < numActiveAudioPlayers; ++i) {
        audioPlayers[i] = dashjs.MediaPlayer().create();
        audioPlayers[i].initialize(audioElements[i]);
        audioPlayers[i].setAutoPlay(false);
        audioPlayers[i].attachSource(mediaUrl + "/audio_" + chStrings[i] + ".mpd");
        // console.log(audioPlayers[i]);
        // console.log(audioPlayers[i].getVideoElement().readyState);
    }

    videoPlayer.xr().on("initialized", function () {
        console.log("xr initialized");
        startSetup();
        console.log(this);
        playbackEventHandler.initialize(videoPlayer, audioPlayers, numActiveAudioPlayers);
    });
}

export function stop() {
    console.log("stopping");
    playbackEventHandler.unregisterEvents();
    videoPlayer.pause();
    disconnectAudio();
    videoPlayer.dispose();
    for (let i = 0; i < numActiveAudioPlayers; ++i)
        audioPlayers[i].reset();
}

function disconnectAudio() {
    for (let i = 0; i < numActiveAudioPlayers; ++i) {
        channelSplitters[i].disconnect();
    }
    channelMerger.disconnect();
    rotator.out.disconnect();
    multiplier.out.disconnect();
    decoder.out.disconnect();
    masterGain.disconnect();
}

function startSetup() {
    if (!audioSetupComplete && !videoSetupComplete) {
        setupAudio();
        setupVideo();
    }
}

function setupAudio() {
    console.log("setup audio!");

    channelMerger = context.createChannelMerger(numCh);
    console.log(channelMerger);

    // initialize ambisonic rotator
    rotator = new HOASTRotator(context, order);
    console.log(rotator);

    // initialize matrix multiplier (for now use always 4th order as zoom matrix is in 4th order format)
    multiplier = new MatrixMultiplier(context, 4);
    console.log(multiplier);

    decoder = new HOASTBinDecoder(context, order);
    console.log(decoder);

    var loader_filters = new HOASTloader(context, order, irs, (foaBuffer, hoaBuffer) => {
        decoder.updateFilters(foaBuffer, hoaBuffer);
        playbackEventHandler.setAllBuffersLoaded(true);
    });
    loader_filters.load();

    masterGain = context.createGain();
    masterGain.gain.value = 1.0;

    videoPlayer.on("volumechange", function () {
        if (masterGain)
            masterGain.gain.value = this.volume();
    });

    for (let i = 0; i < numActiveAudioPlayers; ++i) {
        // console.log(channelSplitters[i]);
        sourceNodes[i].channelCount = chCounts[i];
        // console.log($("#audio_" + chStrings[i])[0]);
        // console.log(sourceNodes[i]);
    }

    connectChannels();

    channelMerger.connect(rotator.in);
    rotator.out.connect(multiplier.in);
    multiplier.out.connect(decoder.in);
    decoder.out.connect(masterGain);
    masterGain.connect(context.destination);

    audioSetupComplete = true;
}

function setupVideo() {
    console.log("setup video");
    videoPlayer.xr().camera.rotation.order = 'YZX'; // in THREE Y is vertical axis! -> set to yaw-pitch-roll
    // console.log(videoPlayer.xr().camera);

    var vidControls = videoPlayer.xr().controls3d;
    vidControls.orbit.minDistance = -700;
    vidControls.orbit.maxDistance = 200;
    console.log(vidControls);

    // this.controls3d.orbit.on( .. ) does not work for custom events!
    // view change
    vidControls.orbit.addEventListener("change", function () { 
        rotator.updateRotationFromCamera(videoPlayer.xr().camera.matrixWorld.elements);
    });

    // view change if HMD is used
    videoPlayer.xr().on("xrCameraUpdate", function () {
        // console.log('yaw: ' + this.camera.rotation.y * 180 / Math.PI);
        // console.log('pitch: ' + this.camera.rotation.z * 180 / Math.PI);
        // console.log('roll: ' + this.camera.rotation.x * 180 / Math.PI);
        // console.log(this.xrPose);
        if (this.xrPose)
            rotator.updateRotationFromCamera(this.xrPose.poseModelMatrix);
    });

    vidControls.orbit.addEventListener("zoom", function () { // zoom change
        // console.log("zoom!");
        //console.log(this.currentDistance);
        //console.log("zoom factor = " + zoom_factor)
        if (this.currentDistance <= 0) {
            let zoom_factor = Math.pow(2, -this.currentDistance / 500);

            for (let zz = 0; zz < zoomfactors.length; zz++) {
                if (zoom_factor > zoomfactors[zoomfactors.length - zz - 1]) {
                    multiplier.updateMtx(zoom[zoomfactors.length - zz - 1]);
                    break;
                }
            }
        } else {
            multiplier.updateMtx(zoom[0]);
        }
    });

    videoSetupComplete = true;
}

function connectChannels() {
    let totalChannelCount = 0;
    for (let i = 0; i < numActiveAudioPlayers; ++i) {
        for (let ch = 0; ch < chCounts[i]; ++ch) {
            channelSplitters[i].connect(channelMerger, ch, totalChannelCount);
            ++totalChannelCount;
        }
    }

}

function setOrderDependentVariables() {
    numCh = (order + 1) * (order + 1);

    switch (order) {
        case 4:
            chCounts = [8, 8, 8, 1];
            chStrings = ["01-08ch", "09-16ch", "17-24ch", "25-25ch"];
            numActiveAudioPlayers = 4;
            irs = "staticfiles/mediadb/irs/hoast_o4.wav";
            break;
        case 3:
            chCounts = [8, 8];
            chStrings = ["01-08ch", "09-16ch"];
            numActiveAudioPlayers = 2;
            irs = "staticfiles/mediadb/irs/hoast_o3.wav";
            break;
        case 2:
            chCounts = [8, 1];
            chStrings = ["01-08ch", "09-09ch"];
            numActiveAudioPlayers = 2;
            irs = "staticfiles/mediadb/irs/hoast_o2.wav";
            break;
        case 1:
            chCounts = [4];
            chStrings = ["01-04ch"];
            numActiveAudioPlayers = 1;
            irs = "staticfiles/mediadb/irs/hoast_o1.wav";
            break;
        default:
            console.error("Error: Unsupported ambisonics order, choose order between 1 and 4.");
    }

}
