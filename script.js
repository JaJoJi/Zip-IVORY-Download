const zipNameSpan = document.getElementById('zipName');
const fileTree = document.getElementById('fileTree');
const downloadBtn = document.getElementById('downloadBtn');
  
const loadingDiv = document.getElementById('loading'); 


async function loadZipStructure() {
  try {
    loadingDiv.style.display = 'block';
    downloadBtn.setAttribute('disabled', '');

    const configResponse = await fetch('./config.json');
    const config = await configResponse.json();
    const zipFilePath = config.zipFilePath;

    console.log(zipFilePath);
    const response = await fetch(zipFilePath);
    if (!response.ok) throw new Error('Failed to fetch ZIP');

    // ใช้ชื่อไฟล์จริงจาก path (เอาแค่ชื่อไฟล์ ไม่เอา path)
    const fileName = zipFilePath.split('/').pop();
    zipNameSpan.textContent = fileName;

    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // สะสมข้อมูล
    let totalUncompressedSize = 0;
    let totalCompressedSize = 0;
    let latestDate = null;
    let fileCount = 0;

    zip.forEach((path, file) => {
      if (!file.dir) {
        fileCount++;
        totalUncompressedSize += file._data.uncompressedSize || 0;
        totalCompressedSize += file._data.compressedSize || 0;

        // หาไฟล์ล่าสุด (date)
        if (!latestDate || file.date > latestDate) {
          latestDate = file.date;
        }
      }
    });

    // แปลงขนาดเป็น KB/MB
    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // แสดงข้อมูลเบื้องต้น
    const infoHTML = `
      <p><strong>Files in ZIP:</strong> ${fileCount}</p>
      <p><strong>Total uncompressed size:</strong> ${formatBytes(totalUncompressedSize)}</p>
      <p><strong>Total compressed size:</strong> ${formatBytes(totalCompressedSize)}</p>
      <p><strong>Last modified file date:</strong> ${latestDate ? latestDate.toLocaleString() : 'N/A'}</p>
    `;

    // แสดงข้อมูลเบื้องต้นใต้ชื่อไฟล์
    zipNameSpan.insertAdjacentHTML('afterend', infoHTML);

    downloadBtn.removeAttribute('disabled');

    // สร้างโครงสร้างไฟล์
    const root = {};
    zip.forEach((path, file) => {
      const parts = path.split('/');
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === '') continue;
        if (!current[part]) {
          current[part] = (i === parts.length - 1 && !file.dir) ? null : {};
        }
        current = current[part] || {};
      }
    });

    fileTree.innerHTML = '';
    loadingDiv.style.display = 'none';
    fileTree.appendChild(buildTree(root));
    downloadBtn.href = zipFilePath;
    downloadBtn.download = fileName;
  } catch (err) {
    zipNameSpan.textContent = 'Error loading ZIP.';
    fileTree.innerHTML = '<p style="color:red">Could not load ZIP file.</p>';
    downloadBtn.setAttribute('disabled', '');
    loadingDiv.style.display = 'none';
    console.error(err);
  }
}


function buildTree(obj) {
  const ul = document.createElement('ul');
  for (const key in obj) {
    const li = document.createElement('li');
    if (obj[key] === null) {
      li.className = 'file';
      li.textContent = key;
    } else {
      li.className = 'folder';
      const span = document.createElement('span');
      span.textContent = key;
      span.addEventListener('click', () => {
        childUl.classList.toggle('collapsed');
      });

      const childUl = buildTree(obj[key]);
      childUl.classList.add('collapsed');

      li.appendChild(span);
      li.appendChild(childUl);
    }
    ul.appendChild(li);
  }
  return ul;
}

loadZipStructure(); // เรียกโหลด ZIP ตอนเริ่ม
