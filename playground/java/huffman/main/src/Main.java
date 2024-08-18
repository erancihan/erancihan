public class Main {
    public static void main(String[] args) {
        HuffmanString hf = new HuffmanString();

        String encoded = hf.encode("A DEAD DAD CEDED A BAD BABE A BEADED ABACA BED");
        System.out.println(encoded);

        String decoded = hf.decode(encoded);
        System.out.println(decoded);
    }
}