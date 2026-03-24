package org.anuj.EvenTAura.util;

import com.google.zxing.*;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;

import java.io.ByteArrayOutputStream;
import java.util.Base64;

public class QRCodeGenerator {

    public static String generateQRCodeBase64(String text) {
        try {
            BitMatrix matrix = new MultiFormatWriter()
                    .encode(text, BarcodeFormat.QR_CODE, 300, 300);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);

            return Base64.getEncoder().encodeToString(baos.toByteArray());

        } catch (Exception e) {
            throw new RuntimeException("QR generation failed");
        }
    }

    public static byte[] generateQRCodeImage(String text) {
            try {
                BitMatrix matrix = new MultiFormatWriter()
                        .encode(text, BarcodeFormat.QR_CODE, 300, 300);

                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                MatrixToImageWriter.writeToStream(matrix, "PNG", baos);

                return baos.toByteArray();

            } catch (Exception e) {
                throw new RuntimeException("QR generation failed", e);
            }
        }
    }