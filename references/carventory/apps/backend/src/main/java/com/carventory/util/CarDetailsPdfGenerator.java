package com.carventory.util;

import com.carventory.entity.Car;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import java.awt.*;
import java.io.InputStream;
import java.io.OutputStream;

@Component
public class CarDetailsPdfGenerator {

    private Image loadLogoImage() throws Exception {
        InputStream stream = getClass().getClassLoader().getResourceAsStream("pdf-logo.png");
        if (stream != null) {
            byte[] bytes = stream.readAllBytes();
            return Image.getInstance(bytes);
        }
        return null;
    }

    public void generateCarDetailsPdf(OutputStream outputStream, Car car) {
        Document document = new Document(PageSize.A4, 40, 40, 40, 40);
        try {
            PdfWriter.getInstance(document, outputStream);
            document.open();

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 46, Color.RED);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 40);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 40);

            // Add Logo Image at the top of the PDF
            Image logo = loadLogoImage();
            if (logo != null) {
                logo.scaleToFit(200, 200);
                logo.setAlignment(Image.ALIGN_CENTER);
                document.add(logo);  // Adds the logo image at the top
            }

            // Title
            Paragraph title = new Paragraph("Car Details", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20f);
            document.add(title);

            // Car Details Table
            PdfPTable carDetailsTable = new PdfPTable(2);
            carDetailsTable.setWidthPercentage(100);
            carDetailsTable.setSpacingBefore(10);
            carDetailsTable.setSpacingAfter(10);
            carDetailsTable.setWidths(new float[]{2f, 2f});

            // Company & Model
            carDetailsTable.addCell(getCell("Company:", labelFont));
            carDetailsTable.addCell(getCell(car.getMake(), normalFont));
            addSeparator(carDetailsTable); // Add simple line after this row

            carDetailsTable.addCell(getCell("Model:", labelFont));
            carDetailsTable.addCell(getCell(car.getModel(), normalFont));
            addSeparator(carDetailsTable); // Add simple line after this row

// Year
            carDetailsTable.addCell(getCell("Year:", labelFont));
            carDetailsTable.addCell(getCell(String.valueOf(car.getYear()), normalFont));
            addSeparator(carDetailsTable); // Add simple line after this row

// KMS Done
            carDetailsTable.addCell(getCell("KM Done:", labelFont));
            carDetailsTable.addCell(getCell(String.valueOf(car.getOdometerReading()), normalFont));
            addSeparator(carDetailsTable); // Add simple line after this row

// Owner
            carDetailsTable.addCell(getCell("Owner:", labelFont));
            carDetailsTable.addCell(getCell(String.valueOf(car.getNumberOfOwners()), normalFont));
            addSeparator(carDetailsTable); // Add simple line after this row

// Fuel Type
            carDetailsTable.addCell(getCell("Fuel Type:", labelFont));
            carDetailsTable.addCell(getCell(car.getFuelType(), normalFont));
            addSeparator(carDetailsTable); // Add simple line after this row

// Colour
            carDetailsTable.addCell(getCell("Colour:", labelFont));
            carDetailsTable.addCell(getCell(car.getColor(), normalFont));
            addSeparator(carDetailsTable); // Add simple line after this row


            document.add(carDetailsTable);

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Error generating car details PDF", e);
        }
    }

    private PdfPCell getCell(String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        return cell;
    }
    private PdfPCell getSpacerCell() {
        PdfPCell spacer = new PdfPCell(new Phrase(" "));
        spacer.setColspan(2);
        spacer.setBorder(Rectangle.NO_BORDER);
        spacer.setPaddingBottom(10f);
        return spacer;
    }

    private void addSeparator(PdfPTable table) {
        PdfPCell separatorCell = new PdfPCell(new Phrase(" "));
        separatorCell.setBorder(Rectangle.BOTTOM); // Add a bottom border
        separatorCell.setBorderWidthBottom(2f); // Thickness of the line
        separatorCell.setColspan(2); // Make it span across two columns
        separatorCell.setPaddingBottom(5f); // Add some space below the line
        table.addCell(separatorCell);
    }
}
