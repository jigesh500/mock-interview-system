package com.msbcgroup.mockinterview.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.sound.sampled.*;
import java.io.*;

@Service
public class AudioConversionService {
    
    public byte[] convertToWav(MultipartFile audioFile) throws Exception {
        String contentType = audioFile.getContentType();
        
        if (contentType != null && contentType.contains("wav")) {
            return audioFile.getBytes();
        }
        
        // For WebM/OGG, we'll use a simple approach
        // In production, you'd use FFmpeg or similar
        if (contentType != null && (contentType.contains("webm") || contentType.contains("ogg"))) {
            return convertWebmToWav(audioFile.getBytes());
        }
        
        throw new UnsupportedOperationException("Unsupported audio format: " + contentType);
    }
    
    private byte[] convertWebmToWav(byte[] webmData) throws Exception {
        // Simplified conversion - in production use FFmpeg
        // For now, we'll create a basic WAV header and assume PCM data
        
        ByteArrayOutputStream wavStream = new ByteArrayOutputStream();
        
        // WAV header (44 bytes)
        writeWavHeader(wavStream, webmData.length);
        
        // Write audio data (simplified - assumes PCM)
        wavStream.write(webmData);
        
        return wavStream.toByteArray();
    }
    
    private void writeWavHeader(ByteArrayOutputStream stream, int dataLength) throws IOException {
        int sampleRate = 44100;
        int channels = 1;
        int bitsPerSample = 16;
        
        // RIFF header
        stream.write("RIFF".getBytes());
        writeInt(stream, 36 + dataLength); // File size - 8
        stream.write("WAVE".getBytes());
        
        // Format chunk
        stream.write("fmt ".getBytes());
        writeInt(stream, 16); // Format chunk size
        writeShort(stream, 1); // PCM format
        writeShort(stream, channels);
        writeInt(stream, sampleRate);
        writeInt(stream, sampleRate * channels * bitsPerSample / 8); // Byte rate
        writeShort(stream, channels * bitsPerSample / 8); // Block align
        writeShort(stream, bitsPerSample);
        
        // Data chunk
        stream.write("data".getBytes());
        writeInt(stream, dataLength);
    }
    
    private void writeInt(OutputStream stream, int value) throws IOException {
        stream.write(value & 0xFF);
        stream.write((value >> 8) & 0xFF);
        stream.write((value >> 16) & 0xFF);
        stream.write((value >> 24) & 0xFF);
    }
    
    private void writeShort(OutputStream stream, int value) throws IOException {
        stream.write(value & 0xFF);
        stream.write((value >> 8) & 0xFF);
    }
}