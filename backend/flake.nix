{
  description = "Faris development flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    nixpkgs-python.url = "github:cachix/nixpkgs-python";
  };

  outputs = { self, nixpkgs, nixpkgs-python }: 
    let
      system = "x86_64-linux";

      pythonVersion = "3.10.1";
      pkgs = import nixpkgs { inherit system; };
      myPython = nixpkgs-python.packages.${system}.${pythonVersion};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = [
          pkgs.util-linux # Provides libuuid
          pkgs.stdenv.cc.cc.lib # Provides libstdc++
          pkgs.alsa-lib # Often needed for Speech SDK audio
          pkgs.openssl
          myPython
        ];
        shellHook = ''
          export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [ 
            pkgs.util-linux 
            pkgs.stdenv.cc.cc.lib 
            pkgs.alsa-lib 
            pkgs.openssl 
          ]}"
        '';
      };
    };
}