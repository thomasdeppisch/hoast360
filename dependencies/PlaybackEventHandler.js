// synchronize playback of several mediaElements

export default class PlaybackEventHandler {

    constructor(ctx) {
        this.context = ctx;
    }

    initialize(videoPlayer, audioPlayers, numActiveAudioPlayers) {
        console.log(videoPlayer);
        this.videoPlayer = videoPlayer;
        this.audioPlayers = audioPlayers;
        this.allBuffersLoaded = false;
        this.wasPlaying = false;
        this.waitingForPlayback = false;
        this.numActiveAudioPlayers = numActiveAudioPlayers;
        this.videoPlayer.bigPlayButton.hide();
        this.videoPlayer.addClass("vjs-seeking");
        this.registerEvents();
        console.log('numActiveAudioPlayer: ' + this.numActiveAudioPlayers);
    }
  
    registerEvents() {
        let self = this;
        this.videoPlayer.bigPlayButton.off('click');
        this.videoPlayer.controlBar.playToggle.off('click');
        var canvControls = this.videoPlayer.vr().canvasPlayerControls;

        canvControls.addEventListener('vrtoggleplay', function() {
            self.togglePlay();
        });

        this.videoPlayer.controlBar.playToggle.on('click', function() {
            self.togglePlay();
        });

        this.videoPlayer.bigPlayButton.on("click", function () {
            self.togglePlay();
        });

        for (let i = 0; i < this.numActiveAudioPlayers; ++i) {
            this.audioPlayers[i].on(dashjs.MediaPlayer.events["CAN_PLAY"], this.onAudioCanPlay, this);
            // this.audioPlayers[i].on(dashjs.MediaPlayer.events["BUFFER_LOADED"], function () {
            //     console.log("audio buffer loaded");
            //     self.checkReadyStates();
            // });
            this.audioPlayers[i].on(dashjs.MediaPlayer.events["PLAYBACK_WAITING"], this.onAudioPlaybackWaiting, this);
            this.audioPlayers[i].on(dashjs.MediaPlayer.events["PLAYBACK_SEEKING"], this.onAudioPlaybackSeeking, this);
        }

        this.videoPlayer.on("canplay", function (event) {
            console.log("video canplay");
            self.checkReadyStates();
        });
    
        this.videoPlayer.on("play", function () {
            console.log("play");
            if (self.context.state !== "running") {
                self.context.resume();
                console.log("resuming context");
            }
    
            for (let i = 0; i < self.numActiveAudioPlayers; ++i) {
                self.audioPlayers[i].play();
            }
        });
    
        this.videoPlayer.on("pause", function () {
            console.log("pause");
            for (let i = 0; i < self.numActiveAudioPlayers; ++i) {
                self.audioPlayers[i].pause();
            }
        });
    
        this.videoPlayer.on("seeking", function () {
            console.log("seeking!");
            self.startWaitingRoutine();
        });

        this.videoPlayer.on("seeked", function() {
            console.log("seeked");
            for (let i = 0; i < self.numActiveAudioPlayers; ++i) {
                self.audioPlayers[i].seek(this.currentTime());
            }
        })
    
        this.videoPlayer.on("waiting", function () {
            console.log("waiting");
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
    }

    unregisterEvents() {
        console.log('unregistering');
        var canvControls = this.videoPlayer.vr().canvasPlayerControls;
        canvControls.removeEventListener('vrtoggleplay');
        this.videoPlayer.controlBar.playToggle.off('click');
        this.videoPlayer.bigPlayButton.off("click");

        for (let i = 0; i < this.numActiveAudioPlayers; ++i) {
            this.audioPlayers[i].off(dashjs.MediaPlayer.events["CAN_PLAY"], this.onAudioCanPlay, this);
            // this.audioPlayers[i].off(dashjs.MediaPlayer.events["BUFFER_LOADED"]);
            this.audioPlayers[i].off(dashjs.MediaPlayer.events["PLAYBACK_WAITING"], this.onAudioPlaybackWaiting, this);
            this.audioPlayers[i].off(dashjs.MediaPlayer.events["PLAYBACK_SEEKING"], this.onAudioPlaybackSeeking, this);
        }

        this.videoPlayer.off("canplay");
        this.videoPlayer.off("play");
        this.videoPlayer.off("pause");
        this.videoPlayer.off("seeking");
        this.videoPlayer.off("seeked");
        this.videoPlayer.off("waiting");
        // this.videoPlayer.off("playing");
        // this.videoPlayer.off("loadeddata");
    }

    onAudioCanPlay() {
        console.log("audio canplay");
        this.checkReadyStates();
    }

    onAudioPlaybackWaiting() {
        console.log("audio waiting");
        this.startWaitingRoutine();
    }

    onAudioPlaybackSeeking () {
        console.log("audio seeking");
        this.startWaitingRoutine();
    }

    startWaitingRoutine() {
        if (!this.waitingForPlayback) {
            this.waitingForPlayback = true;
            //this.wasPaused = videoPlayer.paused();
            this.videoPlayer.pause();
            this.videoPlayer.addClass("vjs-seeking"); // show loading spinner
            for (let i = 0; i < self.numActiveAudioPlayers; ++i) {
                self.audioPlayers[i].pause();
            }
        }
    }

    togglePlay() {
        if (this.wasPlaying) {
            console.log('pausing');
            this.videoPlayer.pause();
            this.wasPlaying = false;
        }
        else {
            console.log('trying to start playback');
            this.tryToStartPlayback();
        }
    }

    checkReadyStates() {
        if (this.readyForPlayback()) {
            console.log('ready!');
            this.videoPlayer.removeClass("vjs-seeking");
            if (this.wasPlaying) {
                this.tryToStartPlayback();
            }                
            else {
                this.videoPlayer.bigPlayButton.show();
            }
        }
    }
    
    //resume playback if audio and video is ready
    tryToStartPlayback() {
        if (this.readyForPlayback()) {
            this.wasPlaying = true;
            this.waitingForPlayback = false;
            this.videoPlayer.play();
        }      
    }
    
    readyForPlayback() {
        if (this.videoPlayer.readyState() >= 3
            && this.audioPlayers.every(p => (p.getVideoElement().readyState === 4) || (p.getVideoElement().readyState === 0)) // either playback ready or no source set
            && this.allBuffersLoaded)
            return true;
        else
            return false;
    }

    setAllBuffersLoaded(isLoaded) {
        console.log('all buffers loaded');
        this.allBuffersLoaded = isLoaded;
    }

  };