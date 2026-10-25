import sys

def create_pdf(page_texts, output_path):
    body = bytearray()
    body.extend(b"%PDF-1.4\n")
    offsets = {}
    
    def add_obj(num, content_bytes):
        offsets[num] = len(body)
        body.extend(f"{num} 0 obj\n".encode('latin1'))
        body.extend(content_bytes)
        body.extend(b"\nendobj\n")

    count = len(page_texts)
    # Obj 1: Catalog
    add_obj(1, b"<< /Type /Catalog /Pages 2 0 R >>")
    
    # Obj 2: Pages
    kids = " ".join(f"{3 + i} 0 R" for i in range(count))
    add_obj(2, f"<< /Type /Pages /Kids [{kids}] /Count {count} >>".encode('latin1'))

    # Obj 3..3+count-1: Page objects
    for i in range(count):
        content_id = 3 + count + 1 + i
        font_id = 3 + count
        add_obj(3 + i, f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>".encode('latin1'))

    # Obj 3+count: Font
    add_obj(3 + count, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    # Content streams
    for i in range(count):
        txt = page_texts[i].replace('(', '').replace(')', '').replace('\\', '')
        stream_data = f"BT /F1 12 Tf 72 712 Td ({txt}) Tj ET".encode('latin1')
        stream_obj = f"<< /Length {len(stream_data)} >>\nstream\n".encode('latin1') + stream_data + b"\nendstream"
        add_obj(3 + count + 1 + i, stream_obj)

    total_objs = 3 + count * 2
    xref_offset = len(body)
    
    # Each xref line MUST be exactly 20 bytes: 10 + 1 + 5 + 1 + 1 + 2 = 20
    xref_lines = [f"xref\n0 {total_objs + 1}\n0000000000 65535 f\r\n"]
    for i in range(1, total_objs + 1):
        xref_lines.append(f"{offsets[i]:010d} 00000 n\r\n")
        
    trailer = f"trailer\n<< /Size {total_objs + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"
    
    body.extend("".join(xref_lines).encode('latin1'))
    body.extend(trailer.encode('latin1'))
    
    with open(output_path, 'wb') as f:
        f.write(body)
    print(f"Wrote {len(body)} bytes to {output_path}")

create_pdf([
    "Page 1: Architecture Overview and System Infrastructure",
    "Page 2: Core Protocols and Transport Handshake",
    "Page 3: BGP operates over TCP port 179 and maintains keepalive timer of 60 seconds"
], "sample_3page.pdf")
