# Medical Case Images

This folder contains the medical images used for the annotation cases.

## Required Images

1. **img1-chest-pneumonia.png**
   - Case: Chest X-ray - Pneumonia
   - Description: Community-acquired pneumonia case study
   - Format: PNG or JPEG
   - Size: Recommended 800x600px or larger

2. **img2-cardiac-ct.png**
   - Case: Cardiac CT - CAD
   - Description: Coronary artery disease evaluation
   - Format: PNG or JPEG
   - Size: Recommended 800x600px or larger

3. **img3-brain-mri.png**
   - Case: Brain MRI - Stroke Case
   - Description: Acute stroke presentation with clear imaging findings
   - Format: PNG or JPEG
   - Size: Recommended 800x600px or larger

## Setup Instructions

1. Place the three image files in this directory
2. Ensure filenames match exactly (case-sensitive)
3. Supported formats: PNG, JPEG, JPG, GIF, WebP
4. The images will be automatically served at `/images/[filename]`

## Image Mapping

- Case ID `case-1` → Brain MRI (img3-brain-mri.png)
- Case ID `case-2` → Chest X-ray (img1-chest-pneumonia.png)  
- Case ID `case-3` → Cardiac CT (img2-cardiac-ct.png)
