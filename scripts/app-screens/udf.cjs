// Önizleme karesi için UYAP biçiminde (.udf) örnek evrak üretir.
// UDF, içinde content.xml bulunan bir ZIP'tir: metin CDATA'da, biçim <elements> altında
// metin aralıklarına (startOffset/length) verilir.

const zlib = require("zlib");

// Sıkıştırmasız (store) ZIP arşivi.
function zipStore(entries) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 adlar
    local.writeUInt16LE(0, 8); // store
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, nameBuf, data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(0, 10);
    dir.writeUInt16LE(0, 12);
    dir.writeUInt16LE(0x21, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const dirBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(dirBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, dirBuf, end]);
}

const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// paragraphs: [{ runs: [{ text, bold? }], align?: 0 sol | 1 orta | 2 sağ | 3 iki yana, tabs?, below?, indent? }]
// Boş satır için { runs: [] }.
function udfDocument(paragraphs) {
  let text = "";
  const elements = paragraphs.map((p) => {
    const runs = p.runs.length ? p.runs : [{ text: "" }];
    const contents = runs.map((r, i) => {
      const value = r.text + (i === runs.length - 1 ? "\n" : "");
      const start = text.length;
      text += value;
      return `<content size="12"${r.bold ? ' bold="true"' : ""} startOffset="${start}" length="${value.length}" />`;
    });
    const props = [
      `Alignment="${p.align ?? 0}"`,
      p.tabs ? `TabSet="${attr(p.tabs)}"` : "",
      p.below ? `SpaceBelow="${p.below}"` : "",
      p.indent ? `FirstLineIndent="${p.indent}"` : "",
    ].filter(Boolean);
    return `<paragraph ${props.join(" ")}>${contents.join("")}</paragraph>`;
  });
  const xml =
    '<?xml version="1.0" encoding="UTF-8" ?>\n' +
    '<template format_id="1.8">\n' +
    `<content><![CDATA[${text}]]></content>\n` +
    '<properties><pageFormat mediaSizeName="1" leftMargin="70.87" rightMargin="56.69" topMargin="56.69" bottomMargin="56.69" paperOrientation="1" headerFOffset="20.0" footerFOffset="20.0" /></properties>\n' +
    `<elements resolver="hvl-default">\n${elements.join("\n")}\n</elements>\n` +
    '<styles><style name="hvl-default" family="Times New Roman" size="12" description="Gövde" /></styles>\n' +
    "</template>\n";
  return zipStore([{ name: "content.xml", data: Buffer.from(xml, "utf8") }]);
}

module.exports = { udfDocument };
