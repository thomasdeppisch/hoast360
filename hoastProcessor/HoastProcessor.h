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

class HoastProcessor
{
public:
    HoastProcessor(int new_order);
    ~HoastProcessor();

    void Process(uintptr_t input_ptr, uintptr_t output_ptr, unsigned channel_count);
    void calculateRotationMatrix(float yaw_rad, float pitch_rad);

private:
    static const unsigned int kRenderQuantumFrames = 128;
    static const unsigned int kBytesPerChannel = kRenderQuantumFrames * sizeof(float);

    const int order;
    const int numShChannels;
    int rotMtxSize;
    float *shRotationMatrix;
    float *oldShRotationMatrix;
    float *processingBuffer;

    void matrixMultiply(float *input_ptr, float *output_ptr, float *matrix_ptr, float *old_matrix_ptr, unsigned channel_count);
    void matrixMultiplyWithFade(float *input_ptr, float *output_ptr, float *matrix_ptr, float *old_matrix_ptr, unsigned channel_count);
    float P(int i, int l, int a, int b, const float *sh_rot_mtx, const int last_order_idx);
    float U(int l, int m, int n, const float *sh_rot_mtx, const int last_order_idx);
    float V(int l, int m, int n, const float *sh_rot_mtx, const int last_order_idx);
    float W(int l, int m, int n, const float *sh_rot_mtx, const int last_order_idx);
};

EMSCRIPTEN_BINDINGS(CLASS_HoastProcessor)
{
    class_<HoastProcessor>("HoastProcessor")
        .constructor<float>()
        .function("process",
                  &HoastProcessor::Process,
                  allow_raw_pointers())
        .function("calculateRotationMatrix",
                  &HoastProcessor::calculateRotationMatrix);
}

#endif /* HoastProcessor_h */
