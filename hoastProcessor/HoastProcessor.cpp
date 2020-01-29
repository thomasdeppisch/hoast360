//
//  HoastProcessor.cpp
//  hoastProcessor
//
//  Created by Thomas Deppisch on 29.01.20.
//  Copyright © 2020 Thomas Deppisch. All rights reserved.
//

#include "HoastProcessor.h"

HoastProcessor::HoastProcessor() {}

void HoastProcessor::Process(uintptr_t input_ptr, uintptr_t output_ptr, unsigned channel_count)
{
  float* input_buffer = reinterpret_cast<float*>(input_ptr);
  float* output_buffer = reinterpret_cast<float*>(output_ptr);

  for (unsigned channel = 0; channel < channel_count; ++channel) {
    float* destination = output_buffer + channel * kRenderQuantumFrames;
    float* source = input_buffer + channel * kRenderQuantumFrames;
    for (int smp = 0; smp < kRenderQuantumFrames; ++smp) {
      // set gain
      *(source + smp) = 0.5f * *(source + smp);
    }

    memcpy(destination, source, kBytesPerChannel);
  }
}
