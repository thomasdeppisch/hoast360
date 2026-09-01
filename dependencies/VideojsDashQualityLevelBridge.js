import * as dashjs from 'dashjs';

export default function attachDashQualityLevelBridge(player) {
    if (!player || typeof player.qualityLevels !== 'function' || !player.dash || !player.dash.mediaPlayer) {
        return;
    }

    const mediaPlayer = player.dash.mediaPlayer;

    if (mediaPlayer.__hoastQualityBridgeAttached) {
        return;
    }

    mediaPlayer.__hoastQualityBridgeAttached = true;

    const qualityLevels = player.qualityLevels();
    let audioMapper = [];

    mediaPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_METADATA_LOADED, () => {
        const videoRates = mediaPlayer.getBitrateInfoListFor('video');
        const audioRates = mediaPlayer.getBitrateInfoListFor('audio');

        if (!videoRates || !videoRates.length) {
            return;
        }

        qualityLevels.dispose();

        const normalizeFactor = videoRates[videoRates.length - 1].bitrate;

        audioMapper = videoRates.map((rate) => {
            if (!audioRates || !audioRates.length) {
                return 0;
            }

            return Math.round((rate.bitrate / normalizeFactor) * (audioRates.length - 1));
        });

        videoRates.forEach((rate) => {
            qualityLevels.addQualityLevel({
                id: String(rate.bitrate),
                width: rate.width,
                height: rate.height,
                bandwidth: rate.bitrate,
                enabled: function(val) {
                    if (val !== undefined) {
                        this.enabled__ = val;
                    } else {
                        return this.enabled__ !== undefined ? this.enabled__ : true;
                    }
                }
            });
        });
    });

    qualityLevels.on('change', (event) => {
        const enabledQualities = qualityLevels.levels_.filter((level) => level.enabled);
        const autoSwitchingEnabled = mediaPlayer.getSettings().streaming.abr.autoSwitchBitrate;

        if (enabledQualities.length === 1) {
            if (autoSwitchingEnabled.video) {
                mediaPlayer.updateSettings({
                    streaming: {
                        abr: {
                            autoSwitchBitrate: {
                                video: false,
                                audio: false
                            }
                        }
                    }
                });
            }

            mediaPlayer.setQualityFor('video', event.selectedIndex);
            mediaPlayer.setQualityFor('audio', audioMapper[event.selectedIndex] || 0);
        } else if (!autoSwitchingEnabled.video) {
            mediaPlayer.updateSettings({
                streaming: {
                    abr: {
                        autoSwitchBitrate: {
                            video: true,
                            audio: true
                        }
                    }
                }
            });
        }
    });

    mediaPlayer.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_REQUESTED, (event) => {
        if (event.mediaType === 'video') {
            qualityLevels.selectedIndex_ = event.newQuality;
        }
    });
}
