#include <iostream>
#include <iomanip>
#include <string>
#include <map>
#include <random>
#include <cmath>

class RNGesus
{
private:
    std::random_device randomDevice;
    std::mt19937_64 gen;
    std::normal_distribution<> distribution;

    double mean;
    double stddev;
public:
    RNGesus(double mean, double stddev, double clamp_l, double clamp_h);
    RNGesus(double mean, double stddev)
        : RNGesus(mean, stddev, 0, 0)
    {}
    RNGesus()
        : RNGesus(3.5, 1)
    {}

    double clamp_l;
    double clamp_h;

    void setMean(double x)
    {
        this->mean = x;
        this->distribution = std::normal_distribution<>(this->mean, this->stddev);
    }
    void setSTDDEV(double x)
    {
        this->stddev = x;
        this->distribution = std::normal_distribution<>(this->mean, this->stddev);
    }

    double do_pull()
    {
        auto val = std::round(this->distribution(this->gen));

        return (this->clamp_l == this->clamp_h)
               ? val
               : std::clamp(val, this->clamp_l, this->clamp_h);
    }
};

RNGesus::RNGesus(double mean, double stddev, double clamp_l, double clamp_h)
{
    this->mean = mean;
    this->stddev = stddev;

    this->clamp_l = clamp_l;
    this->clamp_h = clamp_h;

    this->gen = std::mt19937_64(this->randomDevice());
    this->distribution = std::normal_distribution<>(this->mean, this->stddev);
}

double do_pull(double mean, double stddev, double clamp_l = 0, double clamp_h = 0)
{
    std::random_device rd{};
    std::mt19937_64 gen{rd()};

    // values near the mean are the most likely
    // standard deviation affects the dispersion of generated values from the mean
    std::normal_distribution<> d{mean, stddev};

    auto val = std::round(d(gen));

    return (clamp_l == clamp_h)
           ? val
           : std::clamp(val, clamp_l, clamp_h);
}

void histogram()
{
    auto loop_c = 10000;
    auto hist_d = 200;

    auto rng = RNGesus(3, 0.5, 1, 6);

    std::map<int, int> hist{};
    for (int i = static_cast<int>(rng.clamp_l); i <= rng.clamp_h; i++) { hist[i] = 0; } // init histogram
    for (int n = 0; n < loop_c; ++n) { ++hist[rng.do_pull()]; }

    for (auto p : hist) {
        std::cout
            << std::setw(2) << p.first << ' '
            << std::setw(4) << p.second << ' '
            << std::setw(6) << std::setprecision(4) << (float) p.second / loop_c << ' '
            << std::string(p.second / hist_d, '*')
            << std::endl;
    }
}

int main()
{
    histogram();
}
