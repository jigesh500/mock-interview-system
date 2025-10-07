package com.msbcgroup.mockinterview.service;

import net.sourceforge.tess4j.Tesseract;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.awt.image.BufferedImage;
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
                } catch (TesseractException e) {
                    throw new RuntimeException(e);
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
//    public String readPDF(InputStream inputStream) throws IOException {
//        try (PDDocument document = PDDocument.load(inputStream)) {
//            if (document.isEncrypted()) {
//                throw new IOException("PDF is encrypted and cannot be read");
//            }
//            PDFTextStripper pdfStripper = new PDFTextStripper();
//            return pdfStripper.getText(document).replaceAll("\\s+", " ").trim();
//        }
//    }


    public String readPDF(InputStream inputStream) throws IOException, TesseractException {
        try (PDDocument document = PDDocument.load(inputStream)) {
            if (document.isEncrypted()) {
                throw new IOException("PDF is encrypted");
            }

            PDFTextStripper pdfStripper = new PDFTextStripper();
            String text = pdfStripper.getText(document).trim();

            // If no text extracted, try OCR
            if (text.isEmpty() || text.length() < 50) {
                return extractTextWithOCR(document);
            }

            return text.replaceAll("\\s+", " ");
        }
    }

    private String extractTextWithOCR(PDDocument document) throws IOException, TesseractException {
        // OCR implementation using Tesseract
        Tesseract tesseract = new Tesseract();
        tesseract.setDatapath("path/to/tessdata"); // Download tessdata

        StringBuilder ocrText = new StringBuilder();
        PDFRenderer pdfRenderer = new PDFRenderer(document);

        for (int page = 0; page < document.getNumberOfPages(); page++) {
            BufferedImage image = pdfRenderer.renderImageWithDPI(page, 300, ImageType.RGB);
            String pageText = tesseract.doOCR(image);
            ocrText.append(pageText).append(" ");
        }

        return ocrText.toString().trim();
    }



    private String extractTextFromDocx(InputStream inputStream) throws IOException {
        try (XWPFDocument document = new XWPFDocument(inputStream);
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

}