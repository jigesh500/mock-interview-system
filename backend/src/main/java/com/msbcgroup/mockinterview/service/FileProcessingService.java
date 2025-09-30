package com.msbcgroup.mockinterview.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

@Service
public class FileProcessingService {

    public String extractTextFromFile(MultipartFile file) throws IOException {
        System.out.println("Processing file: " + file.getOriginalFilename());
        System.out.println("File size: " + file.getSize() + " bytes");
        
        String filename = file.getOriginalFilename();
        if (filename == null) throw new IllegalArgumentException("File name is null");

        String extension = filename.substring(filename.lastIndexOf(".")).toLowerCase();
        System.out.println("File extension: " + extension);

        switch (extension) {
            case ".pdf":
                try (InputStream is = file.getInputStream()) {
                    String result = readPDF(is);
                    System.out.println("PDF processing completed. Text length: " + result.length());
                    return result;
                }
            case ".docx":
                try (InputStream is = file.getInputStream()) {
                    String result = extractTextFromDocx(is);
                    System.out.println("DOCX processing completed. Text length: " + result.length());
                    return result;
                }
            case ".txt":
                String result = new String(file.getBytes());
                System.out.println("TXT processing completed. Text length: " + result.length());
                return result;
            default:
                throw new IllegalArgumentException("Unsupported file type: " + extension);
        }
    }
    public String readPDF(InputStream inputStream) throws IOException {
        try (PDDocument document = PDDocument.load(inputStream)) {
            if (document.isEncrypted()) {
                throw new IOException("PDF is encrypted and cannot be read");
            }
            PDFTextStripper pdfStripper = new PDFTextStripper();
            return pdfStripper.getText(document).replaceAll("\\s+", " ").trim();
        }
    }


    private String extractTextFromDocx(InputStream inputStream) throws IOException {
        try (XWPFDocument document = new XWPFDocument(inputStream);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

}