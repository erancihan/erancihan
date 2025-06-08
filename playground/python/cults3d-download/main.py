# flake8: noqa: E501
import math
import random
import time
import argparse
import json
import os
from urllib.parse import urlparse
from urllib.parse import parse_qs
from typing import TypedDict, Optional

from bs4 import BeautifulSoup
import requests
from tqdm import tqdm

OrderDownloadItems = TypedDict(
    "OrderDownloadItems",
    {"link": str, "file_name": str, "is_downloaded": Optional[bool]},
)
OrderDownload = TypedDict(
    "OrderDownload", {"name": str, "link": str, "items": list[OrderDownloadItems]}
)
Order = TypedDict(
    "Order",
    {
        "order_no": str,
        "order_date": str,
        "order_design": list,
        "order_link": str,
        "downloads": list[OrderDownload],
    },
)

DATA_STORAGE_SAVE_PATH = "data_storage.json"
BASE_DIR = "/content/gdrive/My Drive/Documents/STLs/downloads"

SESSION_ID = ""
BASE_URL = "https://cults3d.com/"

DATA_STORAGE = {}


def save_data_storage():
    global DATA_STORAGE

    with open(DATA_STORAGE_SAVE_PATH, "w") as f:
        json.dump(DATA_STORAGE, f, indent=2)


def load_data_storage():
    global DATA_STORAGE

    try:
        with open(DATA_STORAGE_SAVE_PATH, "r") as f:
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
    if not loose_logged_in_check(response.text):
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
            if (
                cells[0] is None
                or cells[1] is None
                or cells[2] is None
                or cells[3] is None
                or cells[4] is None
            ):
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

                    designs.append(
                        {
                            "title": design_title,
                            "link": design_link,
                        }
                    )

            order_link_element = cells[4].select("a")
            order_link = (
                order_link_element[0].get("href")
                if len(order_link_element) > 0
                else None
            )

            order = {
                "order_no": order_no,
                "order_date": order_date,
                "order_design": designs,
                "order_link": order_link,
            }

            orders.append(order)

    return orders


def get_slice_download_link(href: str) -> str:
    html = request_page(href)
    if html is None:
        print(f"Failed to retrieve slice download link from {href}")
        return ""

    document = BeautifulSoup(html, "html.parser")

    download_link = None

    # find the download button that contains the slice download link
    a_tags = document.select("a")
    for a_tag in a_tags:
        if "Download" not in a_tag.text:
            continue

        # there is a download link, return it
        download_link = a_tag.get("href")

    if download_link is None:
        print(f"No download link found in {href}")
        return ""

    return download_link


def parse_order_details_page(document: BeautifulSoup):
    print("Parsing order details page...")

    # is logged in check
    _logged_in = document.select(
        '.nav__action-login > details > summary > div > img[title="Manage my profile"]'
    )
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

        entry = {"name": None, "link": None, "items": []}
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
                    if (
                        download_link_div.select("a")
                        and len(download_link_div.select("a")) > 0
                    ):
                        # get the last link
                        download_link_tag = download_link_div.select("a")[0]
                        if download_link_tag is None:
                            continue

                        if "Slice" in download_link_tag.text:
                            download_name = f"(slice) {download_name}"

                            slice_href = download_link_tag.get("href")

                            download_link = get_slice_download_link(
                                f"{BASE_URL}{slice_href}"
                            )

                            entry["items"].append(
                                {"link": download_link, "file_name": download_name}
                            )
                            continue

                        if "Download all" in download_link_tag.text:
                            if download_name == "":
                                download_name = "all.zip"

                            download_link = download_link_tag.get("href")

                            entry["items"].append(
                                {"link": download_link, "file_name": download_name}
                            )
                            continue

                        if "Download" in download_link_tag.text:
                            download_link = download_link_tag.get("href")

                            entry["items"].append(
                                {"link": download_link, "file_name": download_name}
                            )

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


def create_drive_folder_if_not_exists(path):
    if os.path.exists(path):
        return
    else:
        os.makedirs(path)


def count_downloads(order):
    if "downloads" not in order:
        return 0

    count = 0
    for design in order["downloads"]:
        count += len(design["items"])

    return count


def download_order_files(order: Order):
    global BASE_DIR

    if (
        "downloads" not in order
        or order["downloads"] is None
        or len(order["downloads"]) == 0
    ):
        print("No downloads found in order")
        return

    __count = 0
    __total = count_downloads(order)

    print("number of items to process:", __total)

    for download in order["downloads"]:
        for item in download["items"]:
            __count += 1

            # check if the file exists in the directory
            _file_name = f"{download['name']} - {item['file_name']}"

            create_drive_folder_if_not_exists(f"{BASE_DIR}/{order['order_no']}")
            _destination = f"{BASE_DIR}/{order['order_no']}/{_file_name}"

            # print(f"{__count:3} / {__total:3} : processing '{_file_name}'")

            # create directory if it doesn't exist for the order
            os.makedirs(BASE_DIR, exist_ok=True)

            if os.path.exists(_destination):
                print(f"  > File '{_destination}' already exists, skipping download")
                continue

            # download the file
            # print(f"          > Downloading file {item['file_name']} from {item['link']}")

            _url = f"{BASE_URL}{item['link']}"
            _headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
                "Cookie": f"_session_id={SESSION_ID}",
            }

            response = requests.get(_url, headers=_headers, stream=True)

            total_size = int(response.headers.get("content-length", 0))
            block_size = 1024  # 1 Kibibyte

            with tqdm(total=total_size, unit="B", unit_scale=True) as bar:
                bar.set_description(
                    f"Downloading: {_file_name:100} | {__count:3}/{__total:3}"
                )
                with open(_destination, "wb") as f:
                    for data in response.iter_content(block_size):
                        f.write(data)
                        bar.update(len(data))

            if total_size != 0 and bar.n != total_size:
                raise ValueError(
                    f"ERROR, something went wrong, downloaded {bar.n} out of {total_size} bytes"
                )

            # mark the file as downloaded
            item["is_downloaded"] = True

            # print(f"          > File {item['file_name']} downloaded successfully")

            save_data_storage()


def index(l, f):
    return next((i for i in range(len(l)) if f(l[i])), None)


def action_fetch_orders_from_cults3d():
    load_data_storage()
    print("Fetching orders from Cults3D...")
    orders = get_orders_list()
    if orders:
        print(f"Fetched {len(orders)} orders.")
        print()

        # list orders
        for order in orders:
            order_no = order["order_no"]

            print(
                f"Order: {order['order_no']} - {order['order_date']}",
                f"with {len(order['order_design']):3d} items",
                (
                    ""
                    if index(
                        DATA_STORAGE["orders"],
                        lambda x, order_no=order_no: x["order_no"] == order_no,
                    )
                    != None
                    else "NEW"
                ),
            )

        print()

        # should update data store?
        if input("Update data store? (y/n) ") == "y":
            DATA_STORAGE["orders"] = orders
            save_data_storage()
    else:
        print("No orders found or failed to fetch orders.")

    print("Done")


def action_update_order_details():
    load_data_storage()

    if "orders" in DATA_STORAGE:
        orders = DATA_STORAGE["orders"]
        for i, order in enumerate(orders):
            print(
                f"{i}: {order['order_no']} - {order['order_date']} - number of designs: {len(order['order_design']):3} - {order['order_link']}"
            )

        # get order index to save from user
        order_index = input("Enter the order index to save: ")

        orders_to_download = []
        if order_index == "a" or order_index == "A" or order_index == "all":
            orders_to_download = [(i, order) for i, order in enumerate(orders)]
        else:
            order_index = int(order_index)
            orders_to_download.append(
                (order_index, DATA_STORAGE["orders"][order_index])
            )

        for index, order_to_save in orders_to_download:
            print("::", index, order_to_save["order_link"])

            downloads = get_order_details(order_to_save["order_link"])

            DATA_STORAGE["orders"][index]["downloads"] = downloads
            save_data_storage()
    else:
        print("No orders found in data storage.")

    print("Done")


def action_download_files():
    load_data_storage()

    if "orders" in DATA_STORAGE:
        orders = DATA_STORAGE["orders"]
        for i, order in enumerate(orders):
            print(
                f"{i}: {order['order_no']} - {order['order_date']} - number of designs: {len(order['order_design']):3} - number of downloads: {count_downloads(order):3}"
            )

        # get order index to save from user
        order_index = input("Enter the order index to download: ")

        orders_to_download = []
        if order_index == "a" or order_index == "A" or order_index == "all":
            orders_to_download = [(i, order) for i, order in enumerate(orders)]
        else:
            orders_to_download = [
                (int(order_index), DATA_STORAGE["orders"][int(order_index)])
            ]

        for index, order_to_download in orders_to_download:
            print("::", index, order_to_download["order_link"])

            download_order_files(order_to_download)
    else:
        print("No orders found in data storage.")

    print("Done")


def main():
    global SESSION_ID
    global DATA_STORAGE

    parser = argparse.ArgumentParser(description="Cults3D Order Downloader")
    parser.add_argument(
        "--session-id", type=str, required=True, help="Session ID for Cults3D"
    )
    parser.add_argument(
        "--fetch-orders", action="store_true", help="Fetch orders from Cults3D"
    )
    parser.add_argument(
        "--fetch-order-details", action="store_true", help="Save orders to disk"
    )
    parser.add_argument(
        "--download-files", action="store_true", help="Download files from orders"
    )

    args = parser.parse_args()

    SESSION_ID = args.session_id

    # load data storage from disk, if it exists, otherwise create a new one
    load_data_storage()

    if args.fetch_orders:
        action_fetch_orders_from_cults3d()

    if args.fetch_order_details:
        action_update_order_details()

    if args.download_files:
        action_download_files()


if __name__ == "__main__":
    main()
