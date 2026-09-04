from ftplib import FTP
import os

def connect_glider_ftp():
    ftp = FTP("ftp.ifremer.fr")
    ftp.login()
    ftp.cwd("/ifremer/glider/v2/")
    return ftp


def list_deployments(ftp):
    # each item here is one glider mission — a folder, not a single file
    return ftp.nlst()


def list_files_in_deployment(ftp, deployment_name):
    ftp.cwd(f"/ifremer/glider/v2/{deployment_name}/")
    files = ftp.nlst()
    ftp.cwd("/ifremer/glider/v2/")   # step back up before the next call
    return files


def download_glider_file(ftp, deployment_name, filename):
    local_dir = "backend/data/raw/glider"
    os.makedirs(local_dir, exist_ok=True)
    local_path = os.path.join(local_dir, filename)
    remote_path = f"/ifremer/glider/v2/{deployment_name}/{filename}"

    with open(local_path, "wb") as f:
        ftp.retrbinary(f"RETR {remote_path}", f.write)

    return local_path


# --- Run it, one small step at a time ---

ftp = connect_glider_ftp()

deployments = list_deployments(ftp)
print(f"{len(deployments)} deployments found")
print(deployments[:10])   # just peek at the first 10 names

# pick ONE deployment to test the rest of the pipeline on
test_deployment = deployments[0]
files = list_files_in_deployment(ftp, test_deployment)
print(f"{len(files)} files inside {test_deployment}")
print(files[:5])

# download just one file to confirm everything works end to end
if files:
    saved_to = download_glider_file(ftp, test_deployment, files[0])
    print("Saved:", saved_to)

ftp.quit()