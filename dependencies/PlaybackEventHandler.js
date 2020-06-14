/*
 ==============================================================================
 This file is part of hoast360, the open-source, higher-order Ambisonics, 360
 degree audio/video player.

 https://github.com/thomasdeppisch/hoast360

 Authors: Thomas Deppisch, Nils Meyer-Kahlen
 
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 ==============================================================================
 */

// synchronize playback of several mediaElements
import * as dashjs from 'dashjs';

export default class PlaybackEventHandler {

    constructor(ctx) {
        this.context = ctx;
        this.eventsRegistered = false;
    }

    initialize(videoPlayer, audioPlayer) {
        this.videoPlayer = videoPlayer;
        this.audioPlayer = audioPlayer;
        this.allBuffersLoaded = false;
        this.wasPlaying = false;
        this.waitingForPlayback = false;
        this.isSeeking = false;
        this.videoPlayer.bigPlayButton.hide();
        this.videoPlayer.addClass("vjs-seeking");

        if (!this.eventsRegistered)
            this.registerEvents();
    }

    reset() {
        this.unregisterEvents();
    }

    registerEvents() {
        let self = this;
        this.videoPlayer.bigPlayButton.off('click');
        this.videoPlayer.controlBar.playToggle.off('click');
        var canvControls = this.videoPlayer.xr().canvasPlayerControls;

        canvControls.addEventListener('vrtoggleplay', function () {
            self.togglePlay();
        });

        this.videoPlayer.controlBar.playToggle.on('click', function () {
            self.togglePlay();
        });

        this.videoPlayer.bigPlayButton.on("click", function () {
            self.togglePlay();
        });

        this.audioPlayer.on(dashjs.MediaPlayer.events["CAN_PLAY"], this.onAudioCanPlay, this);
        // this.audioPlayer.on(dashjs.MediaPlayer.events["BUFFER_LOADED"], this.onAudioCanPlay, this);
        this.audioPlayer.on(dashjs.MediaPlayer.events["PLAYBACK_WAITING"], this.onAudioPlaybackWaiting, this);
        this.audioPlayer.on(dashjs.MediaPlayer.events["PLAYBACK_SEEKING"], this.onAudioPlaybackSeeking, this);
        this.audioPlayer.on(dashjs.MediaPlayer.events["PLAYBACK_SEEKED"], this.onAudioPlaybackSeeked, this);

        this.videoPlayer.on("canplay", function () {
            self.checkReadyStates();
        });

        this.videoPlayer.on("play", function () {
            if (self.context.state !== "running") {
                self.context.resume();
                console.log("resuming context");
            }
            self.audioPlayer.play();
        });

        this.videoPlayer.on("pause", function () {
            self.audioPlayer.pause();
        });

        this.videoPlayer.on("seeking", function () {
            self.isSeeking = true;
            self.startWaitingRoutine();
        });

        this.videoPlayer.on("seeked", function () {
            let currTime = this.currentTime();
            self.audioPlayer.getVideoElement().currentTime = currTime; // do not use seek() method, there seems to be a bug
            //self.audioPlayer.seek(currTime);
        })

        this.videoPlayer.on("waiting", function () {
            self.startWaitingRoutine();
        });

        // this.videoPlayer.on("playing", function () {
        //     console.log("playing");
        //     //wasPaused = false;
        //     this.waitingForPlayback = false;
        //     //videoPlayer.removeClass("vjs-seeking"); // remove loading spinner
        // });

        // this.videoPlayer.on("loadeddata", function () {
        //     console.log("loaded video data");
        // });

        this.eventsRegistered = true;
    }

    unregisterEvents() {
        if (!this.eventsRegistered)
            return;

        var canvControls = this.videoPlayer.xr().canvasPlayerControls;
        canvControls.removeEventListener('vrtoggleplay');
        this.videoPlayer.controlBar.playToggle.off('click');
        this.videoPlayer.bigPlayButton.off("click");

        this.audioPlayer.off(dashjs.MediaPlayer.events["CAN_PLAY"], this.onAudioCanPlay, this);
        // this.audioPlayer.off(dashjs.MediaPlayer.events["BUFFER_LOADED"], this.onAudioCanPlay, this);
        this.audioPlayer.off(dashjs.MediaPlayer.events["PLAYBACK_WAITING"], this.onAudioPlaybackWaiting, this);
        this.audioPlayer.off(dashjs.MediaPlayer.events["PLAYBACK_SEEKING"], this.onAudioPlaybackSeeking, this);

        this.videoPlayer.off("canplay");
        // this.videoPlayer.off("play");
        // this.videoPlayer.off("pause");
        this.videoPlayer.off("seeking");
        this.videoPlayer.off("seeked");
        this.videoPlayer.off("waiting");
        // this.videoPlayer.off("playing");
        // this.videoPlayer.off("loadeddata");

        this.eventsRegistered = false;
    }

    onAudioCanPlay() {
        this.checkReadyStates();
    }

    onAudioPlaybackWaiting() {
        this.startWaitingRoutine();
    }

    onAudioPlaybackSeeking() {
        this.startWaitingRoutine();
    }

    onAudioPlaybackSeeked() {
        if (this.audioPlayer.isSeeking())
            return;

        this.isSeeking = false;
        this.checkReadyStates();
    }

    startWaitingRoutine() {
        if (!this.waitingForPlayback) {
            this.waitingForPlayback = true;
            this.videoPlayer.pause();
            this.videoPlayer.addClass("vjs-seeking"); // show loading spinner
            this.audioPlayer.pause();
        }
    }

    togglePlay() {
        if (this.wasPlaying) {
            this.videoPlayer.pause();
            this.wasPlaying = false;
        }
        else {
            if (this.readyForPlayback())
                this.startPlayback();
        }
    }

    checkReadyStates() {
        if (this.readyForPlayback() && this.videoPlayer.paused()) {
            if (this.wasPlaying) {
                this.startPlayback();
            }
            else {
                this.videoPlayer.bigPlayButton.show();
            }
        }
    }

    //resume playback if audio and video is ready
    startPlayback() {
        this.wasPlaying = true;
        this.waitingForPlayback = false;
        this.videoPlayer.play();
    }

    readyForPlayback() {
        if (this.videoPlayer.readyState() >= 3
            && this.isAudioReady()
            && this.allBuffersLoaded
            && !this.isSeeking)
        {
            this.videoPlayer.removeClass("vjs-seeking");
            return true;
        }
        else
        {
            return false;
        }
    }

    isAudioReady() {
        if (this.audioPlayer.getVideoElement().readyState < 3)
            return false;

        return true;
    }

    setAllBuffersLoaded(isLoaded) {
        this.allBuffersLoaded = isLoaded;
        this.checkReadyStates();
    }

}
