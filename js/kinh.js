// Kinh, chú để tụng cùng tiếng mõ. Mỗi dòng ứng với một tiếng mõ.
// Bản Hán Việt truyền thống, đã đối chiếu nguồn; số dòng (lines) phải khớp CHANT_LINES ở server/seed.js.
const daibi = `Nam mô hắc ra đát na đa ra dạ da|Nam mô a rị da|Bà lô yết đế thước bát ra da|Bồ đề tát đỏa bà da|Ma ha tát đỏa bà da|Ma ha ca lô ni ca da|Án|Tát bàn ra phạt duệ|Số đát na đát tỏa|Nam mô tất kiết lật đỏa y mông a rị da|Bà lô kiết đế thất Phật ra lăng đà bà|Nam mô na ra cẩn trì|Hê rị, ma ha bàn đa sa mế|Tát bà a tha đậu du bằng|A thệ dựng|Tát bà tát đa, na ma bà dà|Ma phạt đạt đậu|Đát điệt tha|Án. A bà lô hê|Lô ca đế|Ca ra đế|Di hê rị|Ma ha bồ đề tát đỏa|Tát bà tát bà|Ma ra ma ra|Ma hê ma hê rị đà dựng|Cu lô cu lô yết mông|Độ lô độ lô phạt xà da đế|Ma ha phạt xà da đế|Đà ra đà ra|Địa rị ni|Thất Phật ra da|Giá ra giá ra|Mạ mạ phạt ma ra|Mục đế lệ|Y hê di hê|Thất na thất na|A ra sâm Phật ra xá lợi|Phạt sa phạt sâm|Phật ra xá da|Hô lô hô lô ma ra|Hô lô hô lô hê rị|Ta ra ta ra|Tất rị tất rị|Tô rô tô rô|Bồ đề dạ bồ đề dạ|Bồ đà dạ bồ đà dạ|Di đế rị dạ|Na ra cẩn trì|Địa rị sắc ni na|Ba dạ ma na|Ta bà ha|Tất đà dạ|Ta bà ha|Ma ha tất đà dạ|Ta bà ha|Tất đà du nghệ|Thất bàn ra dạ|Ta bà ha|Na ra cẩn trì|Ta bà ha|Ma ra na ra|Ta bà ha|Tất ra tăng a mục khê da|Ta bà ha|Ta bà ma ha a tất đà dạ|Ta bà ha|Giả kiết ra a tất đà dạ|Ta bà ha|Ba đà ma kiết tất đà dạ|Ta bà ha|Na ra cẩn trì bàn đà ra dạ|Ta bà ha|Ma bà rị thắng yết ra dạ|Ta bà ha|Nam mô hắc ra đát na đa ra dạ da|Nam mô a rị da|Bà lô kiết đế|Thước bàn ra dạ|Ta bà ha|Án. Tất điện đô|Mạn đà ra|Bạt đà gia|Ta bà ha`.split('|');

export const KINH = [
  { id: 'niem', name: 'Niệm Phật', note: 'Mỗi tiếng mõ một câu, tròn 108 câu', lines: Array(108).fill('Nam mô A Di Đà Phật') },
  { id: 'tamkinh', name: 'Bát Nhã Tâm Kinh', note: 'Bản Hán Việt, ngài Huyền Trang dịch', lines: [
    'Quán Tự Tại Bồ Tát', 'hành thâm Bát Nhã Ba La Mật Đa thời,', 'chiếu kiến ngũ uẩn giai không,', 'độ nhất thiết khổ ách.',
    'Xá Lợi Tử!', 'Sắc bất dị không, không bất dị sắc,', 'sắc tức thị không, không tức thị sắc,', 'thọ tưởng hành thức diệc phục như thị.',
    'Xá Lợi Tử!', 'Thị chư pháp không tướng,', 'bất sanh bất diệt, bất cấu bất tịnh,', 'bất tăng bất giảm.',
    'Thị cố không trung vô sắc,', 'vô thọ tưởng hành thức,', 'vô nhãn nhĩ tỷ thiệt thân ý,', 'vô sắc thanh hương vị xúc pháp,', 'vô nhãn giới, nãi chí vô ý thức giới,',
    'vô vô minh, diệc vô vô minh tận,', 'nãi chí vô lão tử, diệc vô lão tử tận,', 'vô khổ tập diệt đạo,', 'vô trí diệc vô đắc.',
    'Dĩ vô sở đắc cố,', 'Bồ Đề Tát Đỏa y Bát Nhã Ba La Mật Đa cố,', 'tâm vô quái ngại,', 'vô quái ngại cố, vô hữu khủng bố,', 'viễn ly điên đảo mộng tưởng,', 'cứu cánh Niết Bàn.',
    'Tam thế chư Phật,', 'y Bát Nhã Ba La Mật Đa cố,', 'đắc A Nậu Đa La Tam Miệu Tam Bồ Đề.',
    'Cố tri Bát Nhã Ba La Mật Đa', 'thị đại thần chú, thị đại minh chú,', 'thị vô thượng chú, thị vô đẳng đẳng chú,', 'năng trừ nhất thiết khổ, chân thật bất hư.',
    'Cố thuyết Bát Nhã Ba La Mật Đa chú,', 'tức thuyết chú viết:', 'Yết đế, yết đế, ba la yết đế,', 'ba la tăng yết đế, bồ đề tát bà ha.',
  ] },
  { id: 'vangsanh', name: 'Chú Vãng Sanh', note: 'Bạt nhất thiết nghiệp chướng căn bản đắc sanh Tịnh độ đà la ni', lines: [
    'Nam mô a di đa bà dạ', 'Đa tha dà đa dạ', 'Đa địa dạ tha', 'A di rị đô bà tỳ', 'A di rị đa tất đam bà tỳ', 'A di rị đa tì ca lan đế', 'A di rị đa tì ca lan đa', 'Dà di nị dà dà na', 'Chỉ đa ca lệ ta bà ha',
  ] },
  { id: 'daibi', name: 'Chú Đại Bi', note: 'Thiên thủ thiên nhãn vô ngại đại bi tâm đà la ni, 84 câu', lines: daibi },
  { id: 'hoihuong', name: 'Kệ Hồi Hướng', note: 'Đọc sau thời kinh, hồi hướng công đức', lines: [
    'Nguyện dĩ thử công đức,', 'phổ cập ư nhất thiết,', 'ngã đẳng dữ chúng sanh,', 'giai cộng thành Phật đạo.',
  ] },
];
