package com.carventory.util;

import com.carventory.dto.ProfitLossDetailsDTO;
import com.carventory.entity.Company;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.pdf.*;
import org.springframework.stereotype.Component;

import java.awt.*;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.List;

@Component
public class ProfitLossPdfGenerator {

    public void generateYearlyReport(OutputStream outputStream, int year, List<ProfitLossDetailsDTO> details,
                                     BigDecimal totalProfit, BigDecimal totalLoss, Company company) {
        Document document = new Document(PageSize.A4, 40, 40, 40, 40);
        try {
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);

            // Add page footer
            writer.setPageEvent(new Footer(company));

            document.open();

            Font companyFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 36, Color.BLACK);
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new Color(0, 77, 64));
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            Image logo = loadLogoImage();
            if (logo != null) {
                logo.scaleToFit(150, 150);
                logo.setAlignment(Image.ALIGN_CENTER);
                document.add(logo);
            }

            Paragraph companyName = new Paragraph(company.getCompanyName(), companyFont);
            companyName.setAlignment(Element.ALIGN_CENTER);
            companyName.setSpacingAfter(20);
            document.add(companyName);

            Paragraph title = new Paragraph("Yearly Profit & Loss Report - " + year, titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Table setup
            PdfPTable table = new PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2, 2, 2, 2, 2, 2, 2, 2});
            table.setSpacingBefore(10);

            addHeaderCell(table, "Car");
            addHeaderCell(table, "VIN");
            addHeaderCell(table, "Purchase Price");
            addHeaderCell(table, "Maintenance Price");
            addHeaderCell(table, "Sale Price");
            addHeaderCell(table, "Maintenance Msg");
            addHeaderCell(table, "Profit");
            addHeaderCell(table, "Loss");

            for (ProfitLossDetailsDTO dto : details) {
                addNormalCell(table, dto.getCarMakeModel());
                addNormalCell(table, dto.getVin());
                addNormalCell(table, "₹" + dto.getPurchasePrice());
                addNormalCell(table, "₹" + dto.getMaintenancePrice());
                addNormalCell(table, "₹" + dto.getSalePrice());
                addNormalCell(table, dto.getMaintenanceDetails());

                // Profit cell - green
                addColoredCell(table, "₹" + dto.getProfit(), new Color(204, 255, 204)); // light green
                // Loss cell - red
                addColoredCell(table, "₹" + dto.getLoss(), new Color(255, 204, 204)); // light red
            }

            document.add(table);

            Paragraph summary = new Paragraph("Total Profit: ₹" + totalProfit + " | Total Loss: ₹" + totalLoss, labelFont);
            summary.setSpacingBefore(20);
            summary.setAlignment(Element.ALIGN_RIGHT);
            document.add(summary);

            // Export timestamp
            String formattedDate = new SimpleDateFormat("dd MMMM yyyy HH:mm").format(new Date());
            Paragraph generated = new Paragraph("Generated on: " + formattedDate, smallFont);
            generated.setSpacingBefore(10);
            generated.setAlignment(Element.ALIGN_RIGHT);
            document.add(generated);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Error generating PDF", e);
        }
    }

    public void generateMonthlyReport(OutputStream outputStream, int year, int month, List<ProfitLossDetailsDTO> details,
                                      BigDecimal totalProfit, BigDecimal totalLoss, Company company) {
        Document document = new Document(PageSize.A4, 40, 40, 40, 40);
        try {
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new Footer(company));

            document.open();

            Font companyFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 36, Color.BLACK);
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new Color(0, 77, 64));
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            Image logo = loadLogoImage();
            if (logo != null) {
                logo.scaleToFit(150, 150);
                logo.setAlignment(Image.ALIGN_CENTER);
                document.add(logo);
            }

            Paragraph companyName = new Paragraph(company.getCompanyName(), companyFont);
            companyName.setAlignment(Element.ALIGN_CENTER);
            companyName.setSpacingAfter(20);
            document.add(companyName);

            String monthName = new SimpleDateFormat("MMMM").format(new SimpleDateFormat("MM").parse(String.format("%02d", month)));
            Paragraph title = new Paragraph("Monthly Profit & Loss Report - " + monthName + " " + year, titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            PdfPTable table = new PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2, 2, 2, 2, 2, 2, 2, 2});
            table.setSpacingBefore(10);

            addHeaderCell(table, "Car");
            addHeaderCell(table, "VIN");
            addHeaderCell(table, "Purchase Price");
            addHeaderCell(table, "Maintenance Price");
            addHeaderCell(table, "Sale Price");
            addHeaderCell(table, "Maintenance Msg");
            addHeaderCell(table, "Profit");
            addHeaderCell(table, "Loss");

            for (ProfitLossDetailsDTO dto : details) {
                addNormalCell(table, dto.getCarMakeModel());
                addNormalCell(table, dto.getVin());
                addNormalCell(table, "₹" + dto.getPurchasePrice());
                addNormalCell(table, "₹" + dto.getMaintenancePrice());
                addNormalCell(table, "₹" + dto.getSalePrice());
                addNormalCell(table, dto.getMaintenanceDetails());

                addColoredCell(table, "₹" + dto.getProfit(), new Color(204, 255, 204)); // green
                addColoredCell(table, "₹" + dto.getLoss(), new Color(255, 204, 204)); // red
            }

            document.add(table);

            Paragraph summary = new Paragraph("Total Profit: ₹" + totalProfit + " | Total Loss: ₹" + totalLoss, labelFont);
            summary.setSpacingBefore(20);
            summary.setAlignment(Element.ALIGN_RIGHT);
            document.add(summary);

            // Export timestamp
            String formattedDate = new SimpleDateFormat("dd MMMM yyyy HH:mm").format(new Date());
            Paragraph generated = new Paragraph("Generated on: " + formattedDate, smallFont);
            generated.setSpacingBefore(10);
            generated.setAlignment(Element.ALIGN_RIGHT);
            document.add(generated);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Error generating PDF", e);
        }
    }

    public void generateDateRangeReport(OutputStream outputStream, LocalDate fromDate, LocalDate toDate,
                                        List<ProfitLossDetailsDTO> details, BigDecimal totalProfit, BigDecimal totalLoss, Company company) {
        Document document = new Document(PageSize.A4, 40, 40, 40, 40);
        try {
            PdfWriter writer = PdfWriter.getInstance(document, outputStream);
            writer.setPageEvent(new Footer(company));

            document.open();

            Font companyFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 36, Color.BLACK);
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new Color(0, 77, 64));
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 10);

            Image logo = loadLogoImage();
            if (logo != null) {
                logo.scaleToFit(150, 150);
                logo.setAlignment(Image.ALIGN_CENTER);
                document.add(logo);
            }

            Paragraph companyName = new Paragraph(company.getCompanyName(), companyFont);
            companyName.setAlignment(Element.ALIGN_CENTER);
            companyName.setSpacingAfter(20);
            document.add(companyName);

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMMM yyyy");
            String fromFormatted = fromDate.format(formatter);
            String toFormatted = toDate.format(formatter);
            Paragraph title = new Paragraph("Profit & Loss Report: " + fromFormatted + " to " + toFormatted, titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            PdfPTable table = new PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2, 2, 2, 2, 2, 2, 2, 2});
            table.setSpacingBefore(10);

            addHeaderCell(table, "Car");
            addHeaderCell(table, "VIN");
            addHeaderCell(table, "Purchase Price");
            addHeaderCell(table, "Maintenance Price");
            addHeaderCell(table, "Sale Price");
            addHeaderCell(table, "Maintenance Msg");
            addHeaderCell(table, "Profit");
            addHeaderCell(table, "Loss");

            for (ProfitLossDetailsDTO dto : details) {
                addNormalCell(table, dto.getCarMakeModel());
                addNormalCell(table, dto.getVin());
                addNormalCell(table, "₹" + dto.getPurchasePrice());
                addNormalCell(table, "₹" + dto.getMaintenancePrice());
                addNormalCell(table, "₹" + dto.getSalePrice());
                addNormalCell(table, dto.getMaintenanceDetails());

                addColoredCell(table, "₹" + dto.getProfit(), new Color(204, 255, 204)); // green
                addColoredCell(table, "₹" + dto.getLoss(), new Color(255, 204, 204));  // red
            }

            document.add(table);

            Paragraph summary = new Paragraph("Total Profit: ₹" + totalProfit + " | Total Loss: ₹" + totalLoss, labelFont);
            summary.setSpacingBefore(20);
            summary.setAlignment(Element.ALIGN_RIGHT);
            document.add(summary);

            // Export timestamp
            String formattedDate = new SimpleDateFormat("dd MMMM yyyy HH:mm").format(new Date());
            Paragraph generated = new Paragraph("Generated on: " + formattedDate, smallFont);
            generated.setSpacingBefore(10);
            generated.setAlignment(Element.ALIGN_RIGHT);
            document.add(generated);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Error generating PDF", e);
        }
    }

    private Image loadLogoImage() throws Exception {
        InputStream stream = getClass().getClassLoader().getResourceAsStream("pdf-logo.png");
        if (stream != null) {
            byte[] bytes = stream.readAllBytes();
            return Image.getInstance(bytes);
        }
        return null;
    }

    private void addHeaderCell(PdfPTable table, String text) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(Color.LIGHT_GRAY);
        cell.setPadding(6);
        table.addCell(cell);
    }

    private void addNormalCell(PdfPTable table, String text) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA, 8);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        table.addCell(cell);
    }

    private void addColoredCell(PdfPTable table, String text, Color bgColor) {
        Font font = FontFactory.getFont(FontFactory.HELVETICA, 8);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bgColor);
        cell.setPadding(5);
        table.addCell(cell);
    }

    // Footer class for page numbers and company note
    private static class Footer extends PdfPageEventHelper {
        Font footerFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, Font.ITALIC, Color.DARK_GRAY);
        private Company company;

        public Footer(Company company) {
            this.company = company;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfContentByte cb = writer.getDirectContent();
            Phrase footer = new Phrase("Page " + writer.getPageNumber(), footerFont);
            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER,
                    footer, (document.right() - document.left()) / 2 + document.leftMargin(), document.bottom() - 10, 0);

            String currentYear = String.valueOf(LocalDate.now().getYear());
            Phrase companyFooter = new Phrase("© " + currentYear + " " + company.getCompanyName() + " – All rights reserved.", footerFont);
            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER,
                    companyFooter, (document.right() - document.left()) / 2 + document.leftMargin(), document.bottom() - 22, 0);
        }
    }
}