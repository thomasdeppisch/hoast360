//
//  HoastProcessor.cpp
//  hoastProcessor
//
//  Created by Thomas Deppisch on 29.01.20.
//  Copyright © 2020 Thomas Deppisch. All rights reserved.
//

#include "HoastProcessor.h"
#include <math.h>
#include <stdio.h>

HoastProcessor::HoastProcessor(int new_order) : 
    order(new_order), 
    numShChannels((new_order + 1) * (new_order + 1))
{
    rotMtxSize = 0;
    // zeroth order does not need to be rotated
    for (int i = 1; i <= order; ++i) {
        rotMtxSize += (2 * i + 1) * (2 * i + 1);
    }

    printf("constructor! order: %d \n", order);
    printf("rotMtxSize: %d \n", rotMtxSize);

    // shRotationMatrix holds (2n+1) x (2n+1) order rotation submatrices in row-major
    shRotationMatrix = new float[rotMtxSize];
    processingBuffer = new float[numShChannels * kRenderQuantumFrames];
}

HoastProcessor::~HoastProcessor()
{
    delete[] shRotationMatrix;
    delete[] processingBuffer;
}

void HoastProcessor::Process(uintptr_t input_ptr, uintptr_t output_ptr, unsigned channel_count)
{
    // printf("kernel processing \n");
    float *input_buffer = reinterpret_cast<float *>(input_ptr);
    float *output_buffer = reinterpret_cast<float *>(output_ptr);

    //matrixMultiply(input_buffer, processingBuffer, shRotationMatrix, channel_count);
    //matrixMultiply(processingBuffer, output_buffer, zoomMatrix, channel_count);

    for (unsigned channel = 0; channel < channel_count; ++channel)
    {
        float *destination = output_buffer + channel * kRenderQuantumFrames;
        float *source = input_buffer + channel * kRenderQuantumFrames;
        //int matrixIdx = channel * rotMtxRowColSize + 
        for (int smp = 0; smp < kRenderQuantumFrames; ++smp)
        {
            *(destination + smp) = 0.5f * *(source + smp);
        }

        //memcpy(destination, source, kBytesPerChannel);
    }
}

void HoastProcessor::matrixMultiply(float *input_ptr, float *output_ptr, float *matrix_ptr, unsigned channel_count)
{
    // matrix multiplication: output = matrix * input
    // expects matrix to be (channel_count x channel_count), input and output to be (channel_count x kRenderQuantumFrames)
    for (unsigned out_channel = 0; out_channel < channel_count; ++out_channel) {
        float *destination_channel = output_ptr + out_channel * kRenderQuantumFrames;
        float *matrix_row = matrix_ptr + out_channel * channel_count; // only valid for quadratic matrix!

        for (unsigned j = 0; j < kRenderQuantumFrames; ++j) {
            float *destination_smp = destination_channel + j;
            *(destination_smp) = 0.0f;
            for (unsigned k = 0; k < channel_count; ++k) {
                *(destination_smp) += *(matrix_row + k) * *(input_ptr + (k * kRenderQuantumFrames) + j);
            }
        }
    }
                
}

void HoastProcessor::calculateRotationMatrix(float yaw_rad, float pitch_rad)
{
    float cosYaw = cosf(yaw_rad);
    float cosPitch = cosf(pitch_rad);
    float sinYaw = sinf(yaw_rad);
    float sinPitch = sinf(pitch_rad);

    // first-order rotation matrix is directly related to cartesian rotation matrix (yaw-pitch-roll, zyx convention)
    shRotationMatrix[0] = cosYaw;
    shRotationMatrix[1] = 0.0f;
    shRotationMatrix[2] = -sinYaw; // +?
    shRotationMatrix[3] = sinYaw * sinPitch;
    shRotationMatrix[4] = cosPitch;
    shRotationMatrix[5] = cosYaw * sinPitch; // -?
    shRotationMatrix[6] = sinYaw * cosPitch; // -?
    shRotationMatrix[7] = -sinPitch; // +?
    shRotationMatrix[8] = cosYaw * cosPitch;

    int thisOrderIdx = 0;
    int lastOrderIdx = 0;
    for (int l = 2; l <= order; ++l)
    {
        lastOrderIdx = thisOrderIdx;
        thisOrderIdx += (2 * (l - 1) + 1) * (2 * (l - 1) + 1);

        for (int m = -l; m <= l; ++m)
        {
            for (int n = -l; n <= l; ++n)
            {
                const int d = (m == 0) ? 1 : 0;
                float denom;
                if (abs(n) == l)
                    denom = (2 * l) * (2 * l - 1);
                else
                    denom = l * l - n * n;

                float u = sqrt((l * l - m * m) / denom);
                float v = sqrt((1.0 + d) * (l + abs(m) - 1.0) * (l + abs(m)) / denom) * (1.0 - 2.0 * d) * 0.5;
                float w = sqrt((l - abs(m) - 1.0) * (l - abs(m)) / denom) * (1.0 - d) * (-0.5);

                if (u != 0.0)
                    u *= U(l, m, n, shRotationMatrix, lastOrderIdx);
                if (v != 0.0)
                    v *= V(l, m, n, shRotationMatrix, lastOrderIdx);
                if (w != 0.0)
                    w *= W(l, m, n, shRotationMatrix, lastOrderIdx);

                shRotationMatrix[thisOrderIdx + (2 * l + 1) * (m + l) + n + l] = u + v + w;
            }
        }
    }

    // for(int i = 0; i < rotMtxSize; i++) {
    //     printf("%f ", shRotationMatrix[i]);
    // }
    // printf("\n");
}

float HoastProcessor::P(int i, int l, int a, int b, const float *sh_rot_mtx, const int last_order_idx)
{
    int iIdx = 3 * (i + 1);
    float ri1 = sh_rot_mtx[iIdx + 2];
    float rim1 = sh_rot_mtx[iIdx];
    float ri0 = sh_rot_mtx[iIdx + 1];

    int lastOrderRowColIdx = last_order_idx + (2 * (l - 1) + 1) * (a + l - 1);

    if (b == -l)
        return ri1 * sh_rot_mtx[lastOrderRowColIdx] + rim1 * sh_rot_mtx[lastOrderRowColIdx + (2 * l - 2)];
    else if (b == l)
        return ri1 * sh_rot_mtx[lastOrderRowColIdx + (2 * l - 2)] - rim1 * sh_rot_mtx[lastOrderRowColIdx];
    else
        return ri0 * sh_rot_mtx[lastOrderRowColIdx + (b + l - 1)];
};

float HoastProcessor::U(int l, int m, int n, const float *sh_rot_mtx, const int last_order_idx)
{
    return P(0, l, m, n, sh_rot_mtx, last_order_idx);
}

float HoastProcessor::V(int l, int m, int n, const float *sh_rot_mtx, const int last_order_idx)
{
    if (m == 0)
    {
        auto p0 = P(1, l, 1, n, sh_rot_mtx, last_order_idx);
        auto p1 = P(-1, l, -1, n, sh_rot_mtx, last_order_idx);
        return p0 + p1;
    }
    else if (m > 0)
    {
        auto p0 = P(1, l, m - 1, n, sh_rot_mtx, last_order_idx);
        if (m == 1)
            return p0 * sqrt(2);
        else
            return p0 - P(-1, l, 1 - m, n, sh_rot_mtx, last_order_idx);
    }
    else
    {
        auto p1 = P(-1, l, -m - 1, n, sh_rot_mtx, last_order_idx);
        if (m == -1)
            return p1 * sqrt(2);
        else
            return p1 + P(1, l, m + 1, n, sh_rot_mtx, last_order_idx);
    }
}

float HoastProcessor::W(int l, int m, int n, const float *sh_rot_mtx, const int last_order_idx)
{
    if (m > 0)
    {
        auto p0 = P(1, l, m + 1, n, sh_rot_mtx, last_order_idx);
        auto p1 = P(-1, l, -m - 1, n, sh_rot_mtx, last_order_idx);
        return p0 + p1;
    }
    else if (m < 0)
    {
        auto p0 = P(1, l, m - 1, n, sh_rot_mtx, last_order_idx);
        auto p1 = P(-1, l, 1 - m, n, sh_rot_mtx, last_order_idx);
        return p0 - p1;
    }

    return 0.0f;
}