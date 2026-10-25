def build_pdf(pages, output_path):
    chunks = [b"%PDF-1.4\n"]
    offsets = {}
    
    def add(num, data):
        cur = sum(len(c) for c in chunks)
        offsets[num] = cur
        chunks.append(f"{num} 0 obj\n".encode('latin1'))
        chunks.append(data)
        chunks.append(b"\nendobj\n")
        
    num_pages = len(pages)
    # Obj 1: Catalog
    add(1, b"<< /Type /Catalog /Pages 2 0 R >>")
    
    # Obj 2: Pages
    kids = " ".join(f"{3 + i} 0 R" for i in range(num_pages))
    add(2, f"<< /Type /Pages /Kids [{kids}] /Count {num_pages} >>".encode('latin1'))
    
    font_id = 3 + num_pages
    # Pages 3 .. 3 + num_pages - 1
    for i in range(num_pages):
        cid = 3 + num_pages + 1 + i
        add(3 + i, f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {cid} 0 R >>".encode('latin1'))
        
    # Font
    add(font_id, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    
    # Streams
    for i in range(num_pages):
        cid = 3 + num_pages + 1 + i
        txt = pages[i].replace('(', '').replace(')', '').replace('\\', '')
        stream_data = f"BT /F1 12 Tf 72 712 Td ({txt}) Tj ET".encode('latin1')
        stream_body = f"<< /Length {len(stream_data)} >>\nstream\n".encode('latin1') + stream_data + b"\nendstream"
        add(cid, stream_body)
        
    total_objs = 3 + num_pages * 2
    xref_offset = sum(len(c) for c in chunks)
    
    # Exactly 20 bytes per xref line: 10 + 1 + 5 + 1 + 1 + 1 + 1 = 20
    xref_lines = [f"xref\n0 {total_objs + 1}\n".encode('latin1')]
    xref_lines.append(b"0000000000 65535 f \n")
    for i in range(1, total_objs + 1):
        line = f"{offsets[i]:010d} 00000 n \n".encode('latin1')
        assert len(line) == 20, f"Line length is {len(line)}, expected 20"
        xref_lines.append(line)
        
    trailer = f"trailer\n<< /Size {total_objs + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode('latin1')
    chunks.extend(xref_lines)
    chunks.append(trailer)
    
    full = b"".join(chunks)
    with open(output_path, 'wb') as f:
        f.write(full)
    print(f"Generated {output_path} ({len(full)} bytes)")

build_pdf([
    "Page 1: Architecture Overview and System Infrastructure",
    "Page 2: Core Protocols and Transport Handshake",
    "Page 3: BGP operates over TCP port 179 and maintains keepalive timer of 60 seconds"
], "sample_3page.pdf")

build_pdf([
    "Page 1: Autonomous Systems and Peering",
    "Page 2: High Availability Clustering and Fault Tolerance",
    "Page 3: Disaster Recovery Objectives and Replication"
], "test.pdf")

build_pdf([
    "",
    "",
    ""
], "scanned_sample.pdf")
