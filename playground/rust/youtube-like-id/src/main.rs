use base64::{
    alphabet,
    engine,
    Engine as _,
};
use std::{str, io::{stdout, Write, stdin}};

fn main() {
    let confg = engine::GeneralPurposeConfig::new()
        .with_encode_padding(false)
        .with_decode_padding_mode(engine::DecodePaddingMode::RequireNone);
    let ngine = engine::GeneralPurpose::new(&alphabet::URL_SAFE, confg);

    let mut to_encode_str: String = String::new();

    print!("Enter the string you want to encode:");

    let _ = stdout().flush();
    stdin().read_line(&mut to_encode_str).expect("Not a correct string!");
    if let Some('\n') = to_encode_str.chars().next_back() {
        to_encode_str.pop();
    }
    if let Some('\r') = to_encode_str.chars().next_back() {
        to_encode_str.pop();
    }

    let encoded = ngine.encode(to_encode_str.as_bytes());
    println!("encoded: {}", encoded);

    let decoded = ngine.decode("OTAwMA").unwrap();
    println!("decoded: {:02X?}", decoded);

    match str::from_utf8(&decoded) {
        Ok(v) => println!("<< {}", v),
        Err(e) => println!("!! {}", e),
    }
}
