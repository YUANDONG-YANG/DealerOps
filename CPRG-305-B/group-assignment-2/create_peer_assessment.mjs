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
  ['Assessment criterion', 'Daniel Watson', 'Xiaomei He'],
  [
    ['Motivation and engagement in assignment', '3/3', '3/3'],
    ['Timely submission of deliverables', '3/3', '3/3'],
    ['Effective communication and problem solving', '3/3', '3/3'],
  ],
  [3800, 2780, 2780]
));

children.push(heading('Other comments for your peers'));
children.push(p('Daniel Watson made an excellent contribution to this assignment. He led the gateway, core API, and UI workflow coverage, participated actively in group discussions, delivered his section drafts on time, and raised useful questions about tenant isolation and blocked/unavailable UI states.'));
children.push(p('Xiaomei He made an excellent contribution to this assignment. She owned the ai-service and dealer-platform coverage, documented clear prompt-boundary, timeout, and failure-safe cases, communicated well with the rest of the group, and completed her tasks on schedule.'));

const doc = new Document({ creator: 'Yuandong Yang', title: 'CPRG305 Group Assignment 2 Peer Assessment', sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children }] });
await fs.writeFile(out, await Packer.toBuffer(doc));
console.log(out);
