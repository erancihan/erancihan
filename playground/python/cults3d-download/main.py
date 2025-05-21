import math
import random
import time
import argparse
import json
import os
from typing import TypedDict, Optional

from bs4 import BeautifulSoup
import requests
from tqdm import tqdm

SESSION_ID = ""
BASE_URL = "https://cults3d.com/"


OrderDownloadItems = TypedDict(
        'OrderDownloadItems', {
            "link": str,
            "file_name": str,
            "is_downloaded": Optional[bool]
        }
    )
OrderDownload = TypedDict(
        'OrderDownload',
        {
            "name": str,
            "link": str,
            "items": list[OrderDownloadItems]
        }
    )
Order = TypedDict(
        'Order', 
        { 
            "order_no": str, 
            "order_date": str, 
            "order_design": list, 
            "order_link": str, 
            "downloads": list[OrderDownload]
        }
    )


DATA_STORAGE = {}


def save_data_storage():
    global DATA_STORAGE
    with open("data_storage.json", "w") as f:
        json.dump(DATA_STORAGE, f, indent=2)
        print(":: data storage updated")


def load_data_storage():
    global DATA_STORAGE

    try:
        with open("data_storage.json", "r") as f:
            DATA_STORAGE = json.load(f)
    except FileNotFoundError:
        print("Data storage not found, creating a new one.")
        DATA_STORAGE = {}

        save_data_storage()


def loose_logged_in_check(html: str) -> bool:
    if html and "/users/sign_in" not in html:
        return True
    
    return False


def request_page(url: str):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
        "Cookie": f"_session_id={SESSION_ID}",
    }

    _min = math.ceil(300)
    _max = math.ceil(2000)
    _wait_time = math.floor(random.uniform(_min, _max)) + _min

    # wait for a random time between 300 and 2000 milliseconds
    print(f"Waiting for {_wait_time / 1000} seconds before requesting {url}")
    time.sleep(_wait_time / 1000)
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to retrieve page: {response.status_code}")
        return None

    # check if user is logged in by checking if body contains "Sign in"
    if loose_logged_in_check(response.text):
        print("User is logged in")
    else:
        print("User is not logged in")
        return None
    
    return response.text


def get_orders_list():
    _url = f"{BASE_URL}/en/orders"

    print(f"Requesting orders list from {_url}")

    html = request_page(_url)
    if html is None:
        print("Failed to retrieve orders list")
        return
    
    # process the orders list

    document = BeautifulSoup(html, "html.parser")

    orders = []

    has_next_page = True
    while has_next_page:
        _next_page_element = document.select(".pagination .paginate.next a")
        if _next_page_element and len(_next_page_element) > 0:
            _next_page_url = _next_page_element[0].get("href")
            print(f"Next page URL: {_next_page_url}")
        else:
            _next_page_url = None
            has_next_page = False

        # get the orders from the current page
        order_rows = document.select("#content table tbody tr")
        for order_row in order_rows:
            cells = order_row.select("td")
            if len(cells) < 5:
                continue
            if cells[0] is None or cells[1] is None or cells[2] is None or cells[3] is None or cells[4] is None:
                continue
            
            order_no = cells[0].text.strip()
            order_date = cells[1].text.strip()

            designs = []
            """
            design structure:
            <td class="creation-cell>
                <div class="grid my-0.125">
                    <div class="grid-cell">
                        <a title="some title" class="align-middle" href="/en/3d-model/art/some-model">
                            <div data-controller="painting" class="rounded img--middle-align mr-0.125 painting" style="width: 32px; height: 32px; display: inline-block;aspect-ratio: 1">
                                <picture>
                                    <source type="image/webp" srcset="" data-painting-target="source">
                                    <img class="painting-image" alt="" width="32" height="32" data-painting-target="img" data-action="load->painting#loaded error->painting#error" src="">
                                </picture>
                            </div>
                            <span class="link--strong"> title </span>
                        </a>
                        <span class="align-middle">creator</span>
                    </div>

                    <div class="grid-cell grid-cell--fit">
                        <a class="btn btn-plain" href="/en/users/<creator>/comments">Contact</a>
                    </div>
                </div>
                ...
            </td>
            """
            for design in cells[2].select("div.grid-cell"):
                design_element = design.select("a")
                if len(design_element) > 0:
                    if "Contact" in design_element[0].text.strip():
                        continue

                    design_title = design_element[0].get("title")
                    design_link = design_element[0].get("href")

                    designs.append({
                        "title": design_title,
                        "link": design_link,
                    })

            order_link_element = cells[4].select("a")
            order_link = order_link_element[0].get("href") if len(order_link_element) > 0 else None

            order = {
                "order_no": order_no,
                "order_date": order_date,
                "order_design": designs,
                "order_link": order_link,
            }

            orders.append(order)

    return orders


def parse_order_details_page(document: BeautifulSoup):
    print("Parsing order details page...")

    # is logged in check
    _logged_in = document.select('.nav__action-login > details > summary > div > img[title="Manage my profile"]')
    if len(_logged_in) == 0:
        print("User is not logged in")
        return []

    entries = []

    order_lines = document.select("#order-lines > div")
    # print(f"Number of order lines: {len(order_lines)}")
    for order_line in order_lines:
        details = order_line.select("div.grid-cell")[1]
        if len(details) == 0:
            continue

        entry = { "name": None, "link": None, "items": []}
        for download in details.children:
            _text = download.text.replace("\n", "").strip()
            if _text == "":
                continue

            # print("download row:", _text)
            if not _text.startswith("Download") and not _text.startswith("Slice"):
                # identifier for download row,
                name_link = download.select("a")[0]
                entry["name"] = name_link.text.replace("\n", "").strip()
                entry["link"] = name_link.get("href")
            else:
                name_div = download.select("div")[-1]
                _file_size = name_div.select("span")[0].text.replace("\n", "").strip()
                _file_name = name_div.text.replace("\n", "").strip()
                download_name = _file_name.replace(_file_size, "").strip()

                for download_link_div in download.select("div")[:-1]:
                    if download_link_div.select("a") and len(download_link_div.select("a")) > 0:
                        # get the last link
                        download_link_tag = download_link_div.select("a")[0]
                        if download_link_tag is None:
                            continue

                        if "Slice" in download_link_tag.text:
                            download_name = f"(slice) {download_name}"
                        if download_name == "" and "Download all" in download_link_tag.text:
                            download_name = "all.zip"

                        download_link = download_link_tag.get("href")

                        entry["items"].append({ "link": download_link, "file_name": download_name })

        entries.append(entry)

    return entries


def get_order_details(order_link: str):
    _next_page_url = order_link

    entries = []

    has_next_page = True
    while has_next_page:
        _url = f"{BASE_URL}{_next_page_url}"

        print(f"Requesting order details from {_url}")

        html = request_page(_url)    
        if html is None:
            print("Failed to retrieve order details")
            return []
        
        document = BeautifulSoup(html, "html.parser")

        _next_page_element = document.select(".pagination .paginate.next a")
        if _next_page_element and len(_next_page_element) > 0:
            _next_page_url = _next_page_element[0].get("href")
            print(f"Next page URL: {_next_page_url}")
        else:
            _next_page_url = None
            has_next_page = False

        # get the orders from the current page
        _data = parse_order_details_page(document)

        entries.extend(_data)

    return entries


BASE_DIR = ""
def download_order_files(order: Order):
    global BASE_DIR

    if "downloads" not in order or order["downloads"] is None or len(order["downloads"]) == 0:
        print("No downloads found in order")
        return

    for download in order["downloads"]:
        for item in download["items"]:
            # check if the file exists in the directory
            _destination = f"{BASE_DIR}/{order['order_no']}/{item['file_name']}"
            if os.path.exists(_destination):
                print(f"File {item['file_name']} already exists, skipping download")
                continue

            # download the file
            print(f"Downloading file {item['file_name']} from {item['link']}")


            # create directory if it doesn't exist for the order
            os.makedirs(BASE_DIR, exist_ok=True)

            _url = f"{BASE_URL}{item['link']}"
            _headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
                "Cookie": f"_session_id={SESSION_ID}",
            }

            response = requests.get(_url, headers=_headers, stream=True)

            total_size = int(response.headers.get('content-length', 0))
            block_size = 1024  # 1 Kibibyte

            with tqdm(total=total_size, unit='B', unit_scale=True) as bar:
                with open(_destination, 'wb') as f:
                    for data in response.iter_content(block_size):
                        f.write(data)
                        bar.update(len(data))

            if total_size != 0 and bar.n != total_size:
                raise ValueError(f"ERROR, something went wrong, downloaded {bar.n} out of {total_size} bytes")

            # mark the file as downloaded
            item["is_downloaded"] = True
            print(f"File {item['file_name']} downloaded successfully")
            save_data_storage()

def count_downloads(order):
    if "downloads" not in order:
        return 0

    count = 0
    for design in order["downloads"]:
        count += len(design["items"])

    return count


def main():
    global SESSION_ID
    global DATA_STORAGE

    parser = argparse.ArgumentParser(description="Cults3D Order Downloader")
    parser.add_argument("--session-id", type=str, required=True, help="Session ID for Cults3D")
    parser.add_argument("--fetch-orders", action="store_true", help="Fetch orders from Cults3D")
    parser.add_argument("--fetch-order-details", action="store_true", help="Save orders to disk")
    parser.add_argument("--download-files", action="store_true", help="Download files from orders")

    args = parser.parse_args()

    SESSION_ID = args.session_id

    # load data storage from disk, if it exists, otherwise create a new one
    load_data_storage()

    if args.fetch_orders:
        print("Fetching orders from Cults3D...")
        orders = get_orders_list()
        if orders:
            print(f"Fetched {len(orders)} orders.")
        else:
            print("No orders found or failed to fetch orders.")

        # save data storage to disk
        DATA_STORAGE["orders"] = orders
        save_data_storage()
    
    if args.fetch_order_details:
        # print orders list
        if "orders" in DATA_STORAGE:
            orders = DATA_STORAGE["orders"]
            for i, order in enumerate(orders):
                print(f"{i}: {order['order_no']} - {order['order_date']} - number of designs: {len(order['order_design']):3} - {order['order_link']}")
        else:
            print("No orders found in data storage.")
            return

        # get order index to save from user
        order_index = int(input("Enter the order index to save: "))
        order_to_save = DATA_STORAGE["orders"][order_index]

        downloads = get_order_details(order_to_save["order_link"])

        DATA_STORAGE["orders"][order_index]["downloads"] = downloads
        save_data_storage()

    if args.download_files:
        # print orders list
        if "orders" in DATA_STORAGE:
            orders = DATA_STORAGE["orders"]
            for i, order in enumerate(orders):
                print(f"{i}: {order['order_no']} - {order['order_date']} - number of designs: {len(order['order_design']):3} - number of downloads: {count_downloads(order):3}")
        else:
            print("No orders found in data storage.")
            return

        # get order index to save from user
        order_index = int(input("Enter the order index to download: "))
        order_to_download = DATA_STORAGE["orders"][order_index]

        download_order_files(order_to_download)


if __name__ == "__main__":
    main()
