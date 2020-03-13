// this file is based on ambi-sceneRotator.js from JSAmbisonics
// adapted to be used with HOAST360
//
// Thomas Deppisch, 2020

////////////////////////////////////////////////////////////////////
//  Archontis Politis
//  archontis.politis@aalto.fi
//  David Poirier-Quinot
//  davipoir@ircam.fr
////////////////////////////////////////////////////////////////////
//
//  JSAmbisonics a JavaScript library for higher-order Ambisonics
//  The library implements Web Audio blocks that perform
//  typical ambisonic processing operations on audio signals.
//
////////////////////////////////////////////////////////////////////

/////////////////
/* HOA ROTATOR */
/////////////////

import * as jshlib from 'spherical-harmonic-transform';
import * as numeric from 'numeric';

export default class HOASTRotator {

    constructor(audioCtx, order) {

        this.ctx = audioCtx;
        this.order = order;
        this.nCh = (order + 1) * (order + 1);
        this.yaw = 0;
        this.pitch = 0;
        this.roll = 0;
        this.rotMtx = numeric.identity(this.nCh);
        this.rotMtxNodes = new Array(this.order);
        // Input and output nodes
        this.in = this.ctx.createChannelSplitter(this.nCh);
        this.out = this.ctx.createChannelMerger(this.nCh);
        
        // Initialize rotation gains to identity matrix
        for (var n = 1; n <= this.order; n++) {
            
            var gains_n = new Array(2 * n + 1);
            for (var i = 0; i < 2 * n + 1; i++) {
                gains_n[i] = new Array(2 * n + 1);
                for (var j = 0; j < 2 * n + 1; j++) {
                    gains_n[i][j] = this.ctx.createGain();
                    if (i == j) gains_n[i][j].gain.value = 1;
                    else gains_n[i][j].gain.value = 0;
                }
            }
            this.rotMtxNodes[n - 1] = gains_n;
        }
        
        // Create connections
        this.in.connect(this.out, 0, 0); // zeroth order ch. does not rotate
        
        var band_idx = 1;
        for (n = 1; n <= this.order; n++) {
            for (i = 0; i < 2 * n + 1; i++) {
                for (j = 0; j < 2 * n + 1; j++) {
                    this.in.connect(this.rotMtxNodes[n - 1][i][j], band_idx + j, 0);
                    this.rotMtxNodes[n - 1][i][j].connect(this.out, 0, band_idx + i);
                }
            }
            band_idx = band_idx + 2 * n + 1;
        }
    }

    updateRotMtx() {

        var yaw = this.yaw * Math.PI / 180;
        var pitch = this.pitch * Math.PI / 180;
        var roll = this.roll * Math.PI / 180;

        this.rotMtx = jshlib.getSHrotMtx(jshlib.yawPitchRoll2Rzyx(yaw, pitch, roll), this.order);
        // console.log('ypr');
        // console.log(this.rotMtx);

        var band_idx = 1;
        for (let n = 1; n < this.order + 1; n++) {

            for (let i = 0; i < 2 * n + 1; i++) {
                for (let j = 0; j < 2 * n + 1; j++) {
                    this.rotMtxNodes[n - 1][i][j].gain.value = this.rotMtx[band_idx + i][band_idx + j];
                }
            }
            band_idx = band_idx + 2 * n + 1;
        }
    }

    updateRotationFromCamera(matrix4) {
        // console.log(matrix4);
        this.rotMtx = jshlib.getSHrotMtx([[matrix4[10], matrix4[8], matrix4[9]], 
                                          [matrix4[2], matrix4[0], matrix4[1]],
                                          [matrix4[6], matrix4[4], matrix4[5]]], this.order);

        // console.log(this.rotMtx);

        var band_idx = 1;
        for (let n = 1; n < this.order + 1; n++) {

            for (let i = 0; i < 2 * n + 1; i++) {
                for (let j = 0; j < 2 * n + 1; j++) {
                    this.rotMtxNodes[n - 1][i][j].gain.value = this.rotMtx[band_idx + i][band_idx + j];
                }
            }
            band_idx = band_idx + 2 * n + 1;
        }
    }
}
