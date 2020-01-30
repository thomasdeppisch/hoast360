//
//  HoastProcessor.h
//  hoastProcessor
//
//  Created by Thomas Deppisch on 29.01.20.
//  Copyright © 2020 Thomas Deppisch. All rights reserved.
//

#ifndef HoastProcessor_h
#define HoastProcessor_h

#include "emscripten/bind.h"
#include <vector>

using namespace emscripten;

class HoastProcessor {
 public:
    HoastProcessor(int new_order);
    ~HoastProcessor();

    void Process(uintptr_t input_ptr, uintptr_t output_ptr, unsigned channel_count);

  private:
    static const unsigned int kRenderQuantumFrames = 128;
    static const unsigned int kBytesPerChannel = kRenderQuantumFrames * sizeof(float);

    const int order;
    const int numShChannels;
    const int rotMtxRowColSize;
    float* shRotationMatrix;

    void calcRotationMatrix(float yaw_rad, float pitch_rad);
};

EMSCRIPTEN_BINDINGS(CLASS_HoastProcessor) {
  class_<HoastProcessor>("HoastProcessor")
      .constructor<float>()
      .function("process",
                &HoastProcessor::Process,
                allow_raw_pointers());
}


#endif /* HoastProcessor_h */
