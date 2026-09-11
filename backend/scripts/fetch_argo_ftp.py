import urllib.request
import pandas as pd
import os
from ftplib import FTP 
import ssl
import certifi

ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())

def download_index():
    target_dir = "/backend/data/raw"       
    os.makedirs(target_dir, exist_ok=True)
    index_path = os.path.join(target_dir, "ar_index_global_prof.txt")

    urllib.request.urlretrieve(
        "https://data-argo.ifremer.fr/ar_index_global_prof.txt",
        index_path
    )
    return index_path  


def load_and_filter_india(index_path):
    idx = pd.read_csv(index_path, comment="#")
    india = idx[
        (idx["institution"] == "IN") &
        idx["latitude"].between(0, 25) &
        idx["longitude"].between(65, 95)
    ]
    return india  


def connect_ftp():
    ftp = FTP("ftp.ifremer.fr")
    ftp.login()
    return ftp 

def download_profile(ftp, file_path):
    local_dir = "data/raw/argo"
    os.makedirs(local_dir, exist_ok=True)
    
    # Ensures path components stay consistent across OS types
    local_name = os.path.basename(file_path)   
    local_path = os.path.join(local_dir, local_name)

    # Clean leading slashes if present to build a clean root path
    clean_relative_path = file_path.lstrip("/")
    remote_path = f"/ifremer/argo/dac/{clean_relative_path}"

    with open(local_path, "wb") as f:
        ftp.retrbinary(f"RETR {remote_path}", f.write)

    return local_path


index_path = download_index()
india = load_and_filter_india(index_path) #currently only argos under incios ones
print(f"{len(india)} profiles found near India")

ftp = connect_ftp()

for file_path in india["file"].head(5):  
    saved_to = download_profile(ftp, file_path)
    print("Saved:", saved_to)

ftp.quit()