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
    numShChannels((new_order + 1) * (new_order + 1)), 
    rotMtxRowColSize(numShChannels - 1)
{
    printf("constructor! order: %d \n", order);
    printf("rotMtxRowColSize: %d \n", rotMtxRowColSize);
    // we do not need to rotate zeroth-order -> array size ((N+1)^2 - 1) x ((N+1)^2 - 1)
    shRotationMatrix = new float[rotMtxRowColSize * rotMtxRowColSize];
}

HoastProcessor::~HoastProcessor()
{
    delete[] shRotationMatrix;
}

void HoastProcessor::Process(uintptr_t input_ptr, uintptr_t output_ptr, unsigned channel_count)
{
    float *input_buffer = reinterpret_cast<float *>(input_ptr);
    float *output_buffer = reinterpret_cast<float *>(output_ptr);

    for (unsigned channel = 0; channel < channel_count; ++channel)
    {
        float *destination = output_buffer + channel * kRenderQuantumFrames;
        float *source = input_buffer + channel * kRenderQuantumFrames;
        for (int smp = 0; smp < kRenderQuantumFrames; ++smp)
        {
            *(destination + smp) = 0.5f * *(source + smp);
        }

        //memcpy(destination, source, kBytesPerChannel);
    }
}

void HoastProcessor::calculateRotationMatrix(float yaw_rad, float pitch_rad)
{
    float cosYaw = cosf(yaw_rad);
    float cosPitch = cosf(pitch_rad);
    float sinYaw = sinf(yaw_rad);
    float sinPitch = sinf(pitch_rad);

    // shRotationMatrix[0] = cosYaw * cosPitch;
    // shRotationMatrix[1] = sinYaw * cosPitch;
    // shRotationMatrix[2] = -sinPitch;
    // shRotationMatrix[0 + rotMtxRowColSize] = -sinYaw;
    // shRotationMatrix[1 + rotMtxRowColSize] = cosYaw;
    // shRotationMatrix[2 + rotMtxRowColSize] = 0.0f;
    // shRotationMatrix[0 + 2 * rotMtxRowColSize] = cosYaw * sinPitch;
    // shRotationMatrix[1 + 2 * rotMtxRowColSize] = sinYaw * sinPitch;
    // shRotationMatrix[2 + 2 * rotMtxRowColSize] = cosPitch;

    // first-order rotation matrix is directly related to cartesian rotation matrix (yaw-pitch-roll, zyx convention)
    shRotationMatrix[0] = cosYaw;
    shRotationMatrix[1] = 0.0f;
    shRotationMatrix[2] = -sinYaw;
    shRotationMatrix[0 + rotMtxRowColSize] = sinYaw * sinPitch;
    shRotationMatrix[1 + rotMtxRowColSize] = cosPitch;
    shRotationMatrix[2 + rotMtxRowColSize] = cosYaw * sinPitch;
    shRotationMatrix[0 + 2 * rotMtxRowColSize] = sinYaw * cosPitch;
    shRotationMatrix[1 + 2 * rotMtxRowColSize] = -sinPitch;
    shRotationMatrix[2 + 2 * rotMtxRowColSize] = cosYaw * cosPitch;

    for (int l = 2; l <= order; ++l)
    {
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
                    u *= U(l, m, n, shRotationMatrix);
                if (v != 0.0)
                    v *= V(l, m, n, shRotationMatrix);
                if (w != 0.0)
                    w *= W(l, m, n, shRotationMatrix);

                // printf("l: %d \n", l);
                // printf("u: %f \n", u);
                // printf("v: %f \n", v);
                // printf("w: %f \n", w);
                // printf("m: %d \n", m);
                // printf("n: %d \n", n);
                // printf("l: %d \n", l);
                // printf("row idx: %d \n", rotMtxRowColSize * (l * l - 1 + m + l));

                shRotationMatrix[rotMtxRowColSize * (l * l - 1 + m + l) + l * l - 1 + n + l] = u + v + w;
            }
        }
    }

    // for(int i = 0; i < rotMtxRowColSize; i++) {
    //     for(int j = 0; j < rotMtxRowColSize; j++) {
    //         printf("%f ", shRotationMatrix[j + i * rotMtxRowColSize]);
    //     }
    //     printf("\n");
    // }
}

float HoastProcessor::P(int i, int l, int a, int b, const float *shRotationMatrix)
{
    int iIdx = rotMtxRowColSize * (i + 1);
    // printf("i: %d \n", i);
    // printf("iIdx: %d \n", iIdx);
    float ri1 = shRotationMatrix[iIdx + 2];
    float rim1 = shRotationMatrix[iIdx];
    float ri0 = shRotationMatrix[iIdx + 1];

    // printf("ri1: %f \n", ri1);
    // printf("rim1: %f \n", rim1);
    // printf("ri0: %f \n", ri0);

    int lastOrderRowColIdx = rotMtxRowColSize * (((l - 1) * (l - 1)) + a + l - 2) + (l - 1) * (l - 1) - 1;
    // printf("a: %d \n", a);
    // printf("l: %d \n", l);
    // printf("lastOrderRowColIdx: %d \n ", lastOrderRowColIdx);
    // printf("shRotationMatrix[lastOrderRowColIdx]: %f \n", shRotationMatrix[lastOrderRowColIdx]);

    if (b == -l)
        return ri1 * shRotationMatrix[lastOrderRowColIdx] + rim1 * shRotationMatrix[lastOrderRowColIdx + (2 * l - 2)];
    else if (b == l)
        return ri1 * shRotationMatrix[lastOrderRowColIdx + (2 * l - 2)] - rim1 * shRotationMatrix[lastOrderRowColIdx];
    else
        return ri0 * shRotationMatrix[lastOrderRowColIdx + (b + l - 1)];
};

float HoastProcessor::U(int l, int m, int n, const float *shRotationMatrix)
{
    return P(0, l, m, n, shRotationMatrix);
}

float HoastProcessor::V(int l, int m, int n, const float *shRotationMatrix)
{
    if (m == 0)
    {
        auto p0 = P(1, l, 1, n, shRotationMatrix);
        auto p1 = P(-1, l, -1, n, shRotationMatrix);
        return p0 + p1;
    }
    else if (m > 0)
    {
        auto p0 = P(1, l, m - 1, n, shRotationMatrix);
        if (m == 1)
            return p0 * sqrt(2);
        else
            return p0 - P(-1, l, 1 - m, n, shRotationMatrix);
    }
    else
    {
        auto p1 = P(-1, l, -m - 1, n, shRotationMatrix);
        if (m == -1)
            return p1 * sqrt(2);
        else
            return p1 + P(1, l, m + 1, n, shRotationMatrix);
    }
}

float HoastProcessor::W(int l, int m, int n, const float *shRotationMatrix)
{
    if (m > 0)
    {
        auto p0 = P(1, l, m + 1, n, shRotationMatrix);
        auto p1 = P(-1, l, -m - 1, n, shRotationMatrix);
        return p0 + p1;
    }
    else if (m < 0)
    {
        auto p0 = P(1, l, m - 1, n, shRotationMatrix);
        auto p1 = P(-1, l, 1 - m, n, shRotationMatrix);
        return p0 - p1;
    }

    return 0.0;
}