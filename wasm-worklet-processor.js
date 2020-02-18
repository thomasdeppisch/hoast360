/**
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

import Module from './gain-processor.wasmmodule.js';
import { RENDER_QUANTUM_FRAMES, MAX_CHANNEL_COUNT, HeapAudioBuffer }
    from './lib/wasm-audio-helper.js';


/**
 * A simple demonstration of WASM-powered AudioWorkletProcessor.
 *
 * @class WASMWorkletProcessor
 * @extends AudioWorkletProcessor
 */
class WASMWorkletProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{
      name: 'gainLin',
      defaultValue: 0.5,
      minValue: 0.0,
      maxValue: 1
    }];
  }

  constructor() {
    super();

    // Allocate the buffer for the heap access. Start with stereo, but it can
    // be expanded up to 32 channels.
    this._heapInputBuffer = new HeapAudioBuffer(Module, RENDER_QUANTUM_FRAMES,
                                                1, MAX_CHANNEL_COUNT);
    this._heapOutputBuffer = new HeapAudioBuffer(Module, RENDER_QUANTUM_FRAMES,
                                                 1, MAX_CHANNEL_COUNT);

    this._kernel = new Module.GainProcessor();

    this._channelCount = 1;

    this._paramChanged = true;

    this.port.onmessage = (event) => {
        // Handling data from the node.
        console.log('message received');
        if (event.data == 'paramChange') {
            console.log(event.data);
            this._paramChanged = true;
        }
    };

  }

  /**
   * System-invoked process callback function.
   * @param  {Array} inputs Incoming audio stream.
   * @param  {Array} outputs Outgoing audio stream.
   * @param  {Object} parameters AudioParam data.
   * @return {Boolean} Active source flag.
   */
  process(inputs, outputs, parameters) {

    let input = inputs[0];
    let output = outputs[0];

    if (this._paramChanged) {
        this._paramChanged = false;
        if (!isNaN(Number(parameters.gainLin)))
            this._kernel.setGain(Number(parameters.gainLin));
    }

    // Copy-in, process and copy-out.
    for (let channel = 0; channel < this._channelCount; ++channel) {
      this._heapInputBuffer.getChannelData(channel).set(input[channel]);
    }
    this._kernel.process(this._heapInputBuffer.getHeapAddress(),
                         this._heapOutputBuffer.getHeapAddress(),
                         this._channelCount);
    for (let channel = 0; channel < this._channelCount; ++channel) {
      output[channel].set(this._heapOutputBuffer.getChannelData(channel));
    }

    return true;
  }

}


registerProcessor('wasm-worklet-processor', WASMWorkletProcessor);
