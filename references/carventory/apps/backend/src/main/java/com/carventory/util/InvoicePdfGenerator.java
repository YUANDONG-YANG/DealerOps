package com.carventory.util;

import com.carventory.entity.Buyer;
import com.carventory.entity.Car;
import com.carventory.entity.Company;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.InputStream;
import java.io.OutputStream;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Component
public class InvoicePdfGenerator {

    private Image loadLogoImage() throws Exception {
        InputStream stream = getClass().getClassLoader().getResourceAsStream("pdf-logo.png");
        if (stream != null) {
            byte[] bytes = stream.readAllBytes();
            return Image.getInstance(bytes);
        }
        return null;
    }

    public void generateBuyerInvoice(OutputStream outputStream, Buyer buyer, Car car) {
        Document document = new Document(PageSize.A4, 40, 40, 5, 10);
        try {
            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Company details (Dynamic)
            Company company = car.getCompany();
            String companyName = company.getCompanyName();
            String companyAddress = (company.getCompanyAddress() != null ? company.getCompanyAddress() : "") +
                    (company.getCity() != null ? ", " + company.getCity() : "") +
                    (company.getPostalCode() != null ? " - " + company.getPostalCode() : "");
            String companyPhones = (company.getCompanyPhone() != null ? company.getCompanyPhone() : "") +
                    (company.getCompanyMobile() != null ? " / " + company.getCompanyMobile() : "");
            String companyEmail = company.getEmail() != null ? company.getEmail() : "";

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 24, Color.BLACK);
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.DARK_GRAY);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 12);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font redFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.RED);

            // Logo
            Image logo1 = loadLogoImage();
            if (logo1 != null) {
                logo1.scaleToFit(100, 100); // Works now
                logo1.setAlignment(Image.ALIGN_CENTER);
                document.add(logo1);
            }

            Paragraph counterName = new Paragraph(companyName, titleFont); //  Dynamic
            counterName.setAlignment(Element.ALIGN_CENTER);
            counterName.setSpacingAfter(10f);
            document.add(counterName);

            Paragraph address = new Paragraph(
                    companyAddress + "\nCell: " + companyPhones +
                            (companyEmail.isEmpty() ? "" : "\nEmail: " + companyEmail) + "\n\n",
                    normalFont
            ); //  Dynamic
            address.setAlignment(Element.ALIGN_CENTER);
            document.add(address);

            Paragraph deliveryNote = new Paragraph("DELIVERY NOTE", subtitleFont);
            deliveryNote.setAlignment(Element.ALIGN_CENTER);
            deliveryNote.setSpacingAfter(10f);
            document.add(deliveryNote);

            // Buyer Info Table
            PdfPTable buyerTable = new PdfPTable(2);
            buyerTable.setWidthPercentage(100);
            buyerTable.setSpacingBefore(10);
            buyerTable.setSpacingAfter(10);
            buyerTable.setWidths(new float[]{1f, 2f});

            document.add(new Paragraph("I/We here by confirm having this day purchases & taken delivery AS IS WHERE IS BASIS from", normalFont));
            buyerTable.addCell(getCell("Mr./Mrs:", labelFont));
            buyerTable.addCell(getCell(car.getSeller().getName(), normalFont));
            buyerTable.addCell(getCell("Address:", labelFont));
            buyerTable.addCell(getCell(car.getSeller().getAddress(), normalFont));

            document.add(buyerTable);

            document.add(new Paragraph("As checked, tried & approved by me/us on this day " +
                    buyer.getSaleDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " at " +
                    LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mma").withLocale(Locale.ENGLISH)).toLowerCase(),
                    normalFont));
            document.add(Chunk.NEWLINE);

            // Vehicle Details Table
            Paragraph sectionTitle = new Paragraph("PARTICULARS OF VEHICLE", subtitleFont);
            sectionTitle.setAlignment(Element.ALIGN_CENTER);
            sectionTitle.setSpacingAfter(20f);
            document.add(sectionTitle);

            PdfPTable carTable = new PdfPTable(4);
            carTable.setWidthPercentage(100);
            carTable.setSpacingAfter(10);
            carTable.setWidths(new float[]{1.8f, 2.2f, 1.8f, 2.2f});

            carTable.addCell(getCell("Registration No:", labelFont));
            carTable.addCell(getCell(car.getVin(), normalFont));
            carTable.addCell(getCell("Company & Model:", labelFont));
            carTable.addCell(getCell(car.getMake() + " " + car.getModel(), normalFont));

            carTable.addCell(getCell("Chassis No:", labelFont));
            carTable.addCell(getCell(car.getChassisNumber(), normalFont));
            carTable.addCell(getCell("Engine No:", labelFont));
            carTable.addCell(getCell(car.getEngineNumber(), normalFont));

            carTable.addCell(getCell("C/o:", labelFont));
            carTable.addCell(getCell(car.getSeller().getName(), normalFont));
            carTable.addCell(getCell("Colour:", labelFont));
            carTable.addCell(getCell(car.getColor(), normalFont));

            document.add(carTable);

            // Declaration
            document.add(new Paragraph("Declaration:", labelFont));
            document.add(new Paragraph("I/We confirm that the vehicle mentioned above is in good running condition and is fully satisfactory as seen, tried, and tested by me/us.", normalFont));
            document.add(new Paragraph("I/We agree to take full responsibility for transferring ownership and for any pending liabilities like RTO tax, municipal tax, insurance, etc., from this moment onward.", normalFont));
            document.add(new Paragraph("● Our responsibilities cease once the vehicle has left our premises.", normalFont));
            document.add(new Paragraph("● Subject to " + company.getCity() + " jurisdiction only.", normalFont)); //  Dynamic
            document.add(Chunk.NEWLINE);

            Paragraph kmNote = new Paragraph("● K.M. Reading No Guarantee ●", redFont);
            kmNote.setSpacingAfter(10f);
            kmNote.setAlignment(Element.ALIGN_CENTER);
            document.add(kmNote);

            // Payment Details
            Paragraph paymentSection = new Paragraph("PAYMENT DETAILS", subtitleFont);
            paymentSection.setAlignment(Element.ALIGN_CENTER);
            paymentSection.setSpacingAfter(10f);
            document.add(paymentSection);

            PdfPTable paymentTable = new PdfPTable(2);
            paymentTable.setWidthPercentage(100);
            paymentTable.setSpacingAfter(10);
            paymentTable.setWidths(new float[]{1f, 2f});

            paymentTable.addCell(getCell("Total Cost:", labelFont));
            paymentTable.addCell(getCell("₹" + buyer.getSalePrice(), normalFont));
            paymentTable.addCell(getCell("Advance Paid:", labelFont));
            paymentTable.addCell(getCell("₹" + buyer.getSalePrice(), normalFont));
            paymentTable.addCell(getCell("Balance Due:", labelFont));
            paymentTable.addCell(getCell("₹" + buyer.getSalePrice(), normalFont));

            document.add(paymentTable);
            document.add(Chunk.NEWLINE);

            // BUYER'S SIGNATURE
            Paragraph buyerSignature = new Paragraph("BUYER'S SIGNATURE", labelFont);
            buyerSignature.setSpacingBefore(10f);
            buyerSignature.setAlignment(Element.ALIGN_LEFT);
            document.add(buyerSignature);

            Paragraph buyerName = new Paragraph("Name: " + buyer.getName(), normalFont);
            buyerName.setAlignment(Element.ALIGN_LEFT);
            document.add(buyerName);

            Paragraph buyerAddress = new Paragraph("Address: " + buyer.getAddress(), normalFont);
            buyerAddress.setAlignment(Element.ALIGN_LEFT);
            document.add(buyerAddress);

            Paragraph buyerPhone = new Paragraph("Phone: " + buyer.getPhone() + "/" + buyer.getPhone(), normalFont);
            buyerPhone.setAlignment(Element.ALIGN_LEFT);
            document.add(buyerPhone);

            //  Dynamic Company Name
            Paragraph forCityCarBazar = new Paragraph("For: " + companyName, labelFont);
            forCityCarBazar.setAlignment(Element.ALIGN_RIGHT);
            document.add(forCityCarBazar);

            document.add(Chunk.NEWLINE);

            // Commission Receipt
            Paragraph receipt = new Paragraph("COMMISSION RECEIPT", subtitleFont);
            receipt.setAlignment(Element.ALIGN_CENTER);
            document.add(receipt);
            document.add(Chunk.NEWLINE);

            Image logo2 = loadLogoImage();
            if (logo2 != null) {
                logo2.scaleToFit(100, 100);
                logo2.setAlignment(Image.ALIGN_CENTER);
                document.add(logo2);
            }

            Paragraph commissionAddress = new Paragraph(
                    companyAddress + "\nCell: " + companyPhones, normalFont
            ); //  Dynamic
            commissionAddress.setAlignment(Element.ALIGN_CENTER);
            document.add(commissionAddress);

            document.add(new Paragraph("Received Rs. ______________ from ___________________ towards brokerage of vehicle", normalFont));
            document.add(new Paragraph("Vehicle Registration No: " + car.getVin(), normalFont));
            document.add(Chunk.NEWLINE);
            document.add(Chunk.NEWLINE);
            document.add(Chunk.NEWLINE);

            PdfPTable signatureTable = new PdfPTable(2);
            signatureTable.setWidthPercentage(100);
            signatureTable.setWidths(new float[]{1f, 1f});

            PdfPCell leftSignature = new PdfPCell(new Phrase("Customer’s Signature: ___________________", normalFont));
            leftSignature.setBorder(Rectangle.NO_BORDER);
            leftSignature.setHorizontalAlignment(Element.ALIGN_LEFT);

            PdfPCell rightSignature = new PdfPCell(new Phrase("For: " + companyName, labelFont)); //  Dynamic
            rightSignature.setBorder(Rectangle.NO_BORDER);
            rightSignature.setHorizontalAlignment(Element.ALIGN_RIGHT);

            signatureTable.addCell(leftSignature);
            signatureTable.addCell(rightSignature);

            document.add(signatureTable);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Error generating invoice PDF", e);
        }
    }

    private PdfPCell getCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setBorder(Rectangle.NO_BORDER);
        return cell;
    }
}
