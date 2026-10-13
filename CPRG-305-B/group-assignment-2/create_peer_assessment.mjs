import fs from 'node:fs/promises';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle } from '/Users/robin/IdeaProjects/DealerOps/node_modules/docx/dist/index.mjs';

const out = '/Users/robin/IdeaProjects/DealerOps/CPRG-305-B/group-assignment-2/Yuandong_Yang_Peer_Assessment.docx';
const blue = '1F4E78';

function p(text='', opts={}) {
  return new Paragraph({ alignment: opts.align, spacing: { after: opts.after ?? 120, line: 276 }, children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 22, color: opts.color })] });
}
function heading(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, color: blue, size: 28 })] }); }
function cell(text, header=false, width=1800) {
  return new TableCell({ width: { size: width, type: WidthType.DXA }, shading: header ? { fill: blue, type: ShadingType.CLEAR } : undefined, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: String(text), bold: header, color: header ? 'FFFFFF' : '000000', size: header ? 19 : 20 })] })] });
}
function table(headers, rows, widths) {
  const border = { top: { style: BorderStyle.SINGLE, size: 4, color: 'B7C9D6' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'B7C9D6' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'B7C9D6' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'B7C9D6' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'D9E2F3' }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D9E2F3' } };
  return new Table({ width: { size: 9360, type: WidthType.DXA }, borders: border, rows: [new TableRow({ children: headers.map((h,i)=>cell(h,true,widths?.[i]??1800)) }), ...rows.map((r)=>new TableRow({ children: r.map((v,i)=>cell(v,false,widths?.[i]??1800)), cantSplit: true }))] });
}

const children = [];
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 200 }, children: [new TextRun({ text: 'Peer Assessment', bold: true, size: 36, color: blue })] }));
children.push(p('Student: Yuandong Yang', { size: 22 }));
children.push(p('Course: CPRG-305, Section B — Software Testing and Deployment', { size: 22 }));
children.push(p('Group: Group 12 (team G2)', { size: 22 }));
children.push(p('Assignment: Group Assignment 2 — Developing a Testing Plan', { size: 22 }));
children.push(p('Date: October 13, 2026', { size: 22, after: 240 }));

children.push(heading('Peer ratings'));
children.push(p('Scale: 1 = Significant area for improvement; 2 = Acceptable but with some areas for improvement; 3 = Excellent contribution.', { italics: true, size: 20 }));
children.push(table(
  ['Assessment criterion', 'Bedgel Fadhil Ndam Woukouo', 'Jackson Warga', 'Logan Jones'],
  [
    ['Motivation and engagement in assignment', '3/3', '3/3', '3/3'],
    ['Timely submission of deliverables', '3/3', '3/3', '3/3'],
    ['Effective communication and problem solving', '3/3', '3/3', '3/3'],
  ],
  [3400, 2000, 2000, 1960]
));

children.push(heading('Additional comments'));
children.push(p('Bedgel Fadhil Ndam Woukouo contributed strongly to the dealer-web workflow and UI test scenarios. He was responsive during planning sessions, delivered agreed workflow cases on time, and raised useful questions about blocked/unavailable UI states.'));
children.push(p('Jackson Warga owned the ai-service and dealer-platform coverage. He documented clear prompt-boundary and timeout cases, communicated AI failure-safe expectations to the rest of the group, and completed his tasks on schedule.'));
children.push(p('Logan Jones led the dealer-gateway and dealer-core coverage, including authentication, tenant isolation, and persistence cases. He provided reliable technical input during planning, met the review and drafting deadlines, and collaborated effectively on cross-service tests.'));

const doc = new Document({ creator: 'Yuandong Yang', title: 'CPRG305 Group Assignment 2 Peer Assessment', sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children }] });
await fs.writeFile(out, await Packer.toBuffer(doc));
console.log(out);
